import axios from 'axios'
import crypto from 'crypto-js'

/**
 * 飞书适配器
 * 负责与飞书开放平台API的所有交互
 */

const FEISHU_API_BASE = 'https://open.feishu.cn'
const TOKEN_REFRESH_THRESHOLD = 30 * 60 * 1000 // 30分钟
const MAX_RETRY = 3
const RETRY_DELAY = 100 // 100ms基础延迟

/**
 * 加密敏感信息
 */
export function encryptSecret(text, key) {
  return crypto.AES.encrypt(text, key).toString()
}

/**
 * 解密敏感信息
 */
export function decryptSecret(ciphertext, key) {
  const bytes = crypto.AES.decrypt(ciphertext, key)
  return bytes.toString(crypto.enc.Utf8)
}

/**
 * 飞书适配器类
 */
export class FeishuAdapter {
  constructor(config) {
    this.appId = config.app_id
    this.appSecret = config.app_secret
    this.accessToken = config.access_token
    this.tokenExpiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null
    this.logger = config.logger || console
  }

  /**
   * 检查并刷新访问令牌
   */
  async ensureAccessToken() {
    const now = new Date()
    
    // 如果token不存在或即将过期，刷新token
    if (!this.accessToken || !this.tokenExpiresAt || 
        (this.tokenExpiresAt.getTime() - now.getTime()) < TOKEN_REFRESH_THRESHOLD) {
      this.logger.info('[FeishuAdapter] Refreshing access token...')
      await this.refreshAccessToken()
    }
    
    return this.accessToken
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(
        `${FEISHU_API_BASE}/open-apis/auth/v3/tenant_access_token/internal`,
        {
          app_id: this.appId,
          app_secret: this.appSecret
        }
      )

      if (response.data.code !== 0) {
        throw new Error(`Failed to refresh token: ${response.data.msg}`)
      }

      this.accessToken = response.data.tenant_access_token
      this.tokenExpiresAt = new Date(Date.now() + response.data.expire * 1000)
      
      this.logger.info(`[FeishuAdapter] Access token refreshed, expires at ${this.tokenExpiresAt.toISOString()}`)
      
      return {
        access_token: this.accessToken,
        expires_at: this.tokenExpiresAt
      }
    } catch (error) {
      this.logger.error('[FeishuAdapter] Failed to refresh access token:', error.message)
      throw error
    }
  }

  /**
   * 发送HTTP请求到飞书API
   */
  async request(method, path, data = null, options = {}) {
    await this.ensureAccessToken()

    const url = `${FEISHU_API_BASE}${path}`
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    let retryCount = 0
    let lastError = null

    while (retryCount <= MAX_RETRY) {
      try {
        const startTime = Date.now()
        this.logger.info(`[FeishuAdapter] ${method} ${path}`)

        const response = await axios({
          method,
          url,
          headers,
          data,
          params: options.params,
          timeout: options.timeout || 30000
        })

        const duration = Date.now() - startTime
        this.logger.info(`[FeishuAdapter] API response: status ${response.status}, duration ${duration}ms, code ${response.data.code}`)

        // 检查飞书API响应码
        if (response.data.code !== 0) {
          const errorMsg = `Feishu API error: ${response.data.msg} (code: ${response.data.code})`
          this.logger.error(`[FeishuAdapter] ${errorMsg}`)
          throw new Error(errorMsg)
        }

        return response.data
      } catch (error) {
        lastError = error

        // 处理限流错误
        if (error.response && error.response.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10)
          this.logger.warn(`[FeishuAdapter] Rate limited, retry after ${retryAfter}s`)

          if (retryCount < MAX_RETRY) {
            await this.sleep(retryAfter * 1000)
            retryCount++
            continue
          }
        }

        // 如果是飞书API错误（非网络错误），不要重试
        if (error.message && error.message.includes('Feishu API error')) {
          this.logger.error(`[FeishuAdapter] Feishu API error, not retrying: ${error.message}`)
          break
        }

        // 其他错误，使用指数退避重试
        if (retryCount < MAX_RETRY) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount)
          this.logger.warn(`[FeishuAdapter] Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY}): ${error.message}`)
          await this.sleep(delay)
          retryCount++
          continue
        }

        break
      }
    }

    this.logger.error(`[FeishuAdapter] Request failed after ${MAX_RETRY} retries:`, lastError.message)
    if (lastError.response && lastError.response.data) {
      this.logger.error('[FeishuAdapter] Error details:', JSON.stringify(lastError.response.data))
    }
    throw lastError
  }

  /**
   * 延迟执行
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取数据表字段列表
   */
  async getFields(appToken, tableId) {
    const response = await this.request(
      'GET',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`
    )
    return response.data.items
  }

  /**
   * 列出所有数据表
   */
  async listTables(appToken) {
    const response = await this.request('GET', `/open-apis/bitable/v1/apps/${appToken}/tables`)
    return response.data
  }

  /**
   * 查询记录（支持分页）
   */
  async searchRecords(appToken, tableId, options = {}) {
    const { filter, sort, pageSize = 100, pageToken } = options
    
    const data = {
      page_size: pageSize
    }
    
    if (filter) data.filter = filter
    if (sort) data.sort = sort
    if (pageToken) data.page_token = pageToken

    this.logger.info(`[FeishuAdapter] Searching records in app ${appToken}, table ${tableId}`)
    
    const response = await this.request(
      'POST',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search`,
      data
    )

    return response.data
  }

  /**
   * 批量新增记录
   */
  async batchCreateRecords(appToken, tableId, records) {
    // 飞书限制单次最多500条
    const chunks = this.chunkArray(records, 500)
    const results = []

    for (let i = 0; i < chunks.length; i++) {
      this.logger.info(`[FeishuAdapter] Batch creating records: chunk ${i + 1}/${chunks.length}, size ${chunks[i].length}`)
      
      const response = await this.request(
        'POST',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`,
        { records: chunks[i] }
      )

      results.push(...response.data.records)
      
      // 批次之间间隔，避免触发限流
      if (i < chunks.length - 1) {
        await this.sleep(200)
      }
    }

    return results
  }

  /**
   * 批量更新记录
   */
  async batchUpdateRecords(appToken, tableId, records) {
    const chunks = this.chunkArray(records, 500)
    const results = []

    for (let i = 0; i < chunks.length; i++) {
      this.logger.info(`[FeishuAdapter] Batch updating records: chunk ${i + 1}/${chunks.length}, size ${chunks[i].length}`)
      
      const response = await this.request(
        'POST',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_update`,
        { records }
      )

      results.push(...response.data.records)
      
      if (i < chunks.length - 1) {
        await this.sleep(200)
      }
    }

    return results
  }

  /**
   * 批量删除记录
   */
  async batchDeleteRecords(appToken, tableId, recordIds) {
    const chunks = this.chunkArray(recordIds, 500)
    
    for (let i = 0; i < chunks.length; i++) {
      this.logger.info(`[FeishuAdapter] Batch deleting records: chunk ${i + 1}/${chunks.length}, size ${chunks[i].length}`)
      
      await this.request(
        'POST',
        `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_delete`,
        { records: chunks[i] }
      )
      
      if (i < chunks.length - 1) {
        await this.sleep(200)
      }
    }
  }

  /**
   * 获取单条记录
   */
  async getRecord(appToken, tableId, recordId) {
    const response = await this.request(
      'GET',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`
    )
    return response.data.record
  }

  /**
   * 更新单条记录
   */
  async updateRecord(appToken, tableId, recordId, fields) {
    const response = await this.request(
      'PUT',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
      { fields }
    )
    return response.data.record
  }

  /**
   * 删除单条记录
   */
  async deleteRecord(appToken, tableId, recordId) {
    await this.request(
      'DELETE',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`
    )
  }

  /**
   * 数组分块
   */
  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 辅助方法：在可用字段中查找最佳匹配
   */
  findBestMatchField(availableFieldNames, candidates) {
    if (!availableFieldNames) return candidates[0] // 默认返回第一个候选
    
    // 1. 尝试精确匹配
    for (const candidate of candidates) {
      if (availableFieldNames.has(candidate)) {
        return candidate
      }
    }

    // 2. 尝试不区分大小写匹配
    const lowerCaseMap = new Map()
    for (const name of availableFieldNames) {
      lowerCaseMap.set(name.toLowerCase(), name)
    }
    
    for (const candidate of candidates) {
      const lowerCandidate = candidate.toLowerCase()
      if (lowerCaseMap.has(lowerCandidate)) {
        return lowerCaseMap.get(lowerCandidate)
      }
    }
    
    return null
  }

  /**
   * 本地内容转换为飞书记录格式
   */
  convertToFeishuRecord(content, tags = [], availableFields = null) {
    const typeMap = {
      'note': '随笔',
      'article': '文章',
      'media': '音视频',
      'book': '书籍'
    }

    // 字段别名映射配置
    const fieldMappings = {
      '记录ID': ['记录ID', 'ID', 'RecordID'],
      '标题': ['标题', 'Title', 'Name'],
      '摘要': ['摘要', 'Summary', 'Abstract'],
      '内容类型': ['内容类型', '分类', 'Type', 'Category'],
      '内容正文': ['内容正文', '内容', '正文', '记录', 'Content', 'Body'],
      '来源': ['来源', '链接', 'URL', 'Source', 'Link', 'url'],
      '评分': ['评分', 'Rating', 'Score'],
      '是否收藏': ['是否收藏', '收藏', 'IsFavorite', 'Favorite'],
      '标签': ['标签', 'Tags', 'Keywords'],
      '创建时间': ['创建时间', '日期', '创建日期', 'CreatedAt', 'Date', '时间'],
      '更新时间': ['更新时间', '修改时间', 'UpdatedAt'],
      '记录来源': ['记录来源', 'SourceType'],
      '附件': ['附件', 'Attachments', 'Files']
    }

    // 原始数据
    const rawData = {
      '记录ID': content.id.toString(),
      '标题': content.title || '',
      '摘要': content.summary || '',
      '内容类型': typeMap[content.type] || content.type,
      '内容正文': content.content || '',
      '来源': content.source || null,
      '评分': content.rating || null,
      '是否收藏': Boolean(content.is_favorite),
      '标签': tags.map(tag => tag.name),
      '创建时间': this.dateToTimestamp(content.created_at),
      '更新时间': this.dateToTimestamp(content.updated_at),
      '记录来源': '本地',
      '附件': content.attachments ? JSON.parse(content.attachments) : []
    }

    // 如果提供了可用字段列表，进行智能匹配并处理类型
    if (availableFields && Array.isArray(availableFields)) {
      const availableFieldMap = new Map(availableFields.map(f => [f.field_name, f]))
      const availableFieldNames = new Set(availableFields.map(f => f.field_name))
      const finalFields = {}

      for (const [key, candidates] of Object.entries(fieldMappings)) {
        const matchedField = this.findBestMatchField(availableFieldNames, candidates)
        if (matchedField) {
          let value = rawData[key]
          const fieldInfo = availableFieldMap.get(matchedField)

          // 特殊类型处理
          if (fieldInfo) {
             // 15 is Hyperlink type
             if (fieldInfo.type === 15 && value && typeof value === 'string') {
                 value = { text: value, link: value }
             }
             // 17 is Attachment type - convert array to Feishu attachment format
             if (fieldInfo.type === 17 && Array.isArray(value)) {
                 value = value.map(att => ({
                   file_token: att.file_token || '',
                   name: att.name || '',
                   type: att.type || '',
                   size: att.size || 0,
                   url: att.url || '',
                   tmp_url: att.tmp_url || ''
                 }))
             }
          }

          finalFields[matchedField] = value
        }
      }
      return { fields: finalFields }
    }

    // 如果没有可用字段列表，使用默认字段名（第一个候选）
    const defaultFields = {}
    for (const [key, candidates] of Object.entries(fieldMappings)) {
      defaultFields[candidates[0]] = rawData[key]
    }

    return {
      fields: defaultFields
    }
  }

  /**
   * 飞书记录转换为本地内容格式
   */
  convertFromFeishuRecord(record) {
    const fields = record.fields
    
    // 辅助方法：尝试获取字段值（支持多个别名）
    const getFieldValue = (aliases) => {
      for (const alias of aliases) {
        if (fields[alias] !== undefined) {
          return fields[alias]
        }
      }
      return undefined
    }

    // 获取分类/类型
    const rawType = this.extractText(getFieldValue(['内容类型', '分类', 'Type', 'Category']))
    
    const typeMap = {
      '随笔': 'note',
      '文章': 'article',
      '音视频': 'media',
      '书籍': 'book'
    }

    // 提取原始数据
    let title = this.extractText(getFieldValue(['标题', 'Title', 'Name']))
    const content = this.extractText(getFieldValue(['内容正文', '内容', '正文', '记录', 'Content', 'Body']))
    
    // 如果标题为空，且内容不为空，自动截取内容作为标题
    if (!title && content) {
      // 截取前30个字符
      title = content.slice(0, 30).replace(/[\r\n]+/g, ' ')
      if (content.length > 30) title += '...'
    }

    return {
      id: getFieldValue(['记录ID', 'ID']) ? parseInt(getFieldValue(['记录ID', 'ID']), 10) : null,
      title: title,
      summary: this.extractText(getFieldValue(['摘要', 'Summary'])),
      type: typeMap[rawType] || 'note',
      content: content,
      source: this.extractText(getFieldValue(['来源', '链接', 'URL', 'Source', 'Link'])),
      rating: getFieldValue(['评分', 'Rating']),
      is_favorite: (getFieldValue(['是否收藏', '收藏', 'Favorite', 'IsFavorite'])) ? 1 : 0,
      tags: getFieldValue(['标签', 'Tags']) || [],
      created_at: this.timestampToDate(getFieldValue(['创建时间', '日期', '创建日期', 'CreatedAt', 'Date'])),
      updated_at: this.timestampToDate(getFieldValue(['更新时间', '修改时间', 'UpdatedAt'])),
      feishu_record_id: record.record_id,
      attachments: this.extractAttachments(getFieldValue(['附件', 'Attachments', 'Files']))
    }
  }

  /**
   * 辅助方法：提取文本内容
   * 飞书字段可能是字符串，也可能是包含text属性的对象数组
   */
  extractText(fieldValue) {
    if (fieldValue === null || fieldValue === undefined) return ''
    
    // 如果是字符串，直接返回
    if (typeof fieldValue === 'string') return fieldValue
    
    // 如果是数组 (Segment结构)
    if (Array.isArray(fieldValue)) {
      return fieldValue.map(item => {
        // 如果元素本身是字符串（某些多选字段）
        if (typeof item === 'string') return item
        
        // 文本类型 / URL类型 / @提及类型
        if (item.text) return item.text
        if (item.link) return item.link
        if (item.name) return item.name
        
        return ''
      }).join('')
    }
    
    // 如果是单个对象 (Url等)
    if (typeof fieldValue === 'object') {
      return fieldValue.text || fieldValue.link || ''
    }
    
    return String(fieldValue)
  }

  /**
   * 日期转换为飞书时间戳（毫秒）
   */
  dateToTimestamp(dateString) {
    if (!dateString) return null
    return new Date(dateString).getTime()
  }

  /**
   * 飞书时间戳转换为ISO日期字符串
   */
  timestampToDate(timestamp) {
    if (!timestamp) return null
    return new Date(timestamp).toISOString()
  }

  /**
   * 提取附件信息
   * 飞书附件字段是一个数组，包含文件信息
   */
  extractAttachments(fieldValue) {
    if (!fieldValue) return []

    // 如果已经是数组，直接处理
    if (Array.isArray(fieldValue)) {
      return fieldValue.map(att => ({
        file_token: att.file_token || '',
        name: att.name || att.file_name || '未命名文件',
        type: att.type || att.mime_type || '',
        size: att.size || 0,
        url: att.url || '',
        tmp_url: att.tmp_url || ''
      }))
    }

    return []
  }
}

export default FeishuAdapter
