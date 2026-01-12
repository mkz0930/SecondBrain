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
        this.logger.info(`[FeishuAdapter] API response: status ${response.status}, duration ${duration}ms`)

        // 检查飞书API响应码
        if (response.data.code !== 0) {
          throw new Error(`Feishu API error: ${response.data.msg} (code: ${response.data.code})`)
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

        // 其他错误，使用指数退避重试
        if (retryCount < MAX_RETRY) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount)
          this.logger.warn(`[FeishuAdapter] Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY})`)
          await this.sleep(delay)
          retryCount++
          continue
        }

        break
      }
    }

    this.logger.error(`[FeishuAdapter] Request failed after ${MAX_RETRY} retries:`, lastError.message)
    throw lastError
  }

  /**
   * 延迟执行
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
   * 本地内容转换为飞书记录格式
   */
  convertToFeishuRecord(content, tags = []) {
    const typeMap = {
      'note': '随笔',
      'article': '文章',
      'media': '音视频',
      'book': '书籍'
    }

    return {
      fields: {
        '记录ID': content.id.toString(),
        '标题': content.title || '',
        '内容类型': typeMap[content.type] || content.type,
        '内容正文': content.content || '',
        '来源': content.source || '',
        '评分': content.rating || null,
        '是否收藏': Boolean(content.is_favorite),
        '标签': tags.map(tag => tag.name),
        '创建时间': this.dateToTimestamp(content.created_at),
        '更新时间': this.dateToTimestamp(content.updated_at),
        '记录来源': '本地'
      }
    }
  }

  /**
   * 飞书记录转换为本地内容格式
   */
  convertFromFeishuRecord(record) {
    const fields = record.fields
    const typeMap = {
      '随笔': 'note',
      '文章': 'article',
      '音视频': 'media',
      '书籍': 'book'
    }

    return {
      id: fields['记录ID'] ? parseInt(fields['记录ID'], 10) : null,
      title: fields['标题'] || '',
      type: typeMap[fields['内容类型']] || 'note',
      content: fields['内容正文'] || '',
      source: fields['来源'] || '',
      rating: fields['评分'] || null,
      is_favorite: fields['是否收藏'] ? 1 : 0,
      tags: fields['标签'] || [],
      created_at: this.timestampToDate(fields['创建时间']),
      updated_at: this.timestampToDate(fields['更新时间']),
      feishu_record_id: record.record_id
    }
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
}

export default FeishuAdapter
