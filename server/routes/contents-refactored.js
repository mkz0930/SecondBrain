import express from 'express'
import { query, queryOne, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'
import { analyzeContent, optimizeContentFormat } from '../services/ai-service.js'
import {
  enrichContent,
  enrichContents,
  verifyContentOwnership,
  logContentAccess,
  softDeleteContent,
  toggleFavorite as toggleFavoriteService,
  updateRating as updateRatingService
} from '../services/content-service.js'
import {
  attachTagsToContent,
  updateContentTags
} from '../services/tag-service.js'
import {
  fetchAndParseUrl,
  isValidUrl,
  normalizeUrl
} from '../services/url-service.js'
import logger from '../utils/logger.js'
import asyncHandler from '../utils/async-handler.js'
import { success, successWithPagination, error as errorResponse, notFound, validationError } from '../utils/response.js'
import { createQueryBuilder } from '../utils/query-builder.js'

const router = express.Router()
router.use(requireUser)

/**
 * 解析布尔值
 * @param {*} value - 要解析的值
 * @returns {boolean}
 */
function parseBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

/**
 * 规范化排序字段
 * @param {string} sort - 排序字段
 * @returns {string}
 */
function normalizeSort(sort) {
  const allowed = new Set(['created_at', 'updated_at', 'title', 'rating'])
  return allowed.has(sort) ? sort : 'created_at'
}

/**
 * 规范化排序方向
 * @param {string} order - 排序方向
 * @returns {string}
 */
function normalizeOrder(order) {
  return order === 'asc' ? 'ASC' : 'DESC'
}

/**
 * GET /api/contents
 * 获取内容列表（支持分页、筛选、搜索）
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    type,
    tag,
    is_favorite,
    search,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    limit = 20,
    updated_since,
    include_deleted
  } = req.query

  // 构建查询
  const builder = createQueryBuilder(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM access_logs al WHERE al.content_id = c.id) as access_count,
      (SELECT COUNT(*) FROM annotations an WHERE an.content_id = c.id) as annotation_count,
      length(COALESCE(c.title, '')) + length(COALESCE(c.content, '')) as content_length
    FROM contents c
  `)

  builder.where('c.user_id = ?', req.user.id)

  if (!parseBoolean(include_deleted)) {
    builder.where('c.deleted_at IS NULL')
  }

  if (updated_since) {
    builder.where('(c.updated_at >= ? OR c.deleted_at >= ?)', updated_since, updated_since)
  }

  builder.whereIf(type, 'c.type = ?', type)
  builder.whereIf(is_favorite !== undefined && is_favorite !== null, 'c.is_favorite = ?', parseBoolean(is_favorite) ? 1 : 0)
  builder.whereLike(search, 'c.title', 'c.content')

  if (tag) {
    builder.whereExists(
      `SELECT 1 FROM content_tags ct
       JOIN tags t ON ct.tag_id = t.id
       WHERE ct.content_id = c.id AND t.name = ? AND t.user_id = ?`,
      tag, req.user.id
    )
  }

  builder.orderBy(`c.${normalizeSort(sort)}`, normalizeOrder(order))
  builder.paginate(page, limit)

  // 获取总数
  const countQuery = builder.buildCount()
  const countResult = await queryOne(countQuery.query, countQuery.params)
  const total = countResult.count

  // 获取数据
  const dataQuery = builder.build()
  const contents = await query(dataQuery.query, dataQuery.params)

  // 丰富内容数据
  const enrichedContents = await enrichContents(contents, req.user.id)

  return successWithPagination(res, enrichedContents, {
    page,
    limit,
    total
  })
}))

/**
 * GET /api/contents/:id
 * 获取单个内容详情
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const includeDeleted = parseBoolean(req.query.include_deleted)

  const whereClause = includeDeleted
    ? 'WHERE id = ? AND user_id = ?'
    : 'WHERE id = ? AND user_id = ? AND deleted_at IS NULL'

  const content = await queryOne(
    `SELECT * FROM contents ${whereClause}`,
    [id, req.user.id]
  )

  if (!content) {
    return notFound(res, 'Content not found')
  }

  // 丰富内容数据
  const enrichedContent = await enrichContent(content, req.user.id)

  // 获取批注
  const annotations = await query(
    'SELECT * FROM annotations WHERE content_id = ? ORDER BY created_at DESC',
    [id]
  )
  enrichedContent.annotations = annotations

  // 记录访问
  await logContentAccess(id, req.user.id)

  return success(res, enrichedContent)
}))

/**
 * POST /api/contents/analyze
 * 分析内容（AI）
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  const { content } = req.body

  if (!content) {
    return validationError(res, 'Content is required')
  }

  const result = await analyzeContent(content)

  if (!result) {
    return errorResponse(res, 'AI Service unavailable (Check API Key)', 503)
  }

  return success(res, result)
}))

/**
 * POST /api/contents/fetch-url
 * 获取并解析 URL 内容
 */
router.post('/fetch-url', asyncHandler(async (req, res) => {
  const { url } = req.body

  if (!url) {
    return validationError(res, 'URL is required')
  }

  // 验证 URL 格式
  if (!isValidUrl(url)) {
    return validationError(res, 'Invalid URL format')
  }

  logger.info(`Fetching URL: ${url}`)

  const result = await fetchAndParseUrl(url)

  if (result.error) {
    return errorResponse(res, result.error, 400)
  }

  logger.info(`Successfully fetched and parsed URL: ${url}`)

  return success(res, {
    title: result.title || '',
    content: result.content || '',
    excerpt: result.excerpt || '',
    html: result.html || '',
    url: result.url
  })
}))

/**
 * POST /api/contents/quick-save
 * 快速保存（获取 + 分析 + 保存）
 */
router.post('/quick-save', asyncHandler(async (req, res) => {
  const { url } = req.body

  if (!url) {
    return validationError(res, 'URL is required')
  }

  logger.info(`Quick save URL: ${url}`)

  // 步骤 1: 获取内容
  const fetchResult = await fetchAndParseUrl(url)
  const fetchedContent = fetchResult.content || url
  const fetchedTitle = fetchResult.title || 'New Note'

  // 步骤 2: AI 分析
  let aiResult
  try {
    aiResult = await analyzeContent(fetchedContent, url)
  } catch (aiError) {
    logger.warn(`AI analysis failed: ${aiError.message}`)
  }

  // 步骤 3: 准备数据
  const title = (aiResult && aiResult.title) ? aiResult.title : fetchedTitle
  const type = (aiResult && aiResult.type) ? aiResult.type : '文章'
  const summary = (aiResult && aiResult.summary) ? aiResult.summary : ''
  const content = fetchedContent

  // 步骤 4: 保存到数据库
  const result = await run(
    `INSERT INTO contents (user_id, type, title, content, summary, url, source, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, type, title, content, summary, url, url, null]
  )

  const contentId = result.lastID

  // 步骤 5: 处理标签
  if (aiResult && aiResult.tags && aiResult.tags.length > 0) {
    await attachTagsToContent(contentId, aiResult.tags, req.user.id)
  }

  logger.info(`Quick save successful: content ID ${contentId}`)

  return success(res, {
    id: contentId,
    title,
    summary,
    type,
    tags: (aiResult && aiResult.tags) ? aiResult.tags : []
  }, 'Content saved successfully', 201)
}))

/**
 * POST /api/contents/batch
 * 批量保存
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { items } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return validationError(res, 'Items array is required')
  }

  if (items.length > 50) {
    return validationError(res, '单次最多批量保存 50 条')
  }

  logger.info(`Batch save: ${items.length} items`)

  const results = []

  for (const item of items) {
    try {
      const { url, timestamp } = item

      if (!url) {
        results.push({ success: false, error: 'URL is required', url })
        continue
      }

      // 检查是否已存在
      const existing = await queryOne(
        'SELECT id FROM contents WHERE url = ? AND user_id = ? AND deleted_at IS NULL',
        [url, req.user.id]
      )

      if (existing) {
        results.push({
          success: true,
          id: existing.id,
          message: 'Already exists',
          url
        })
        continue
      }

      // 获取内容
      const fetchResult = await fetchAndParseUrl(url, { timeout: 10000 })
      const fetchedContent = fetchResult.content || url
      const fetchedTitle = fetchResult.title || 'New Note'

      // AI 分析
      let aiResult
      try {
        aiResult = await analyzeContent(fetchedContent, url)
      } catch (aiError) {
        logger.warn(`AI analysis failed for ${url}: ${aiError.message}`)
      }

      const title = (aiResult && aiResult.title) ? aiResult.title : fetchedTitle
      const type = (aiResult && aiResult.type) ? aiResult.type : '文章'
      const summary = (aiResult && aiResult.summary) ? aiResult.summary : ''

      // 保存
      const result = await run(
        `INSERT INTO contents (user_id, type, title, content, summary, url, source, rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, type, title, fetchedContent, summary, url, url, null]
      )

      const contentId = result.lastID

      // 处理标签
      if (aiResult && aiResult.tags && aiResult.tags.length > 0) {
        await attachTagsToContent(contentId, aiResult.tags, req.user.id)
      }

      results.push({
        success: true,
        id: contentId,
        title,
        url
      })

    } catch (itemError) {
      logger.error('Batch save item error:', itemError)
      results.push({
        success: false,
        error: itemError.message,
        url: item.url
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  logger.info(`Batch save completed: ${successCount}/${items.length} successful`)

  return success(res, {
    results,
    total: items.length,
    success: successCount,
    failed: items.length - successCount
  })
}))

/**
 * POST /api/contents
 * 创建新内容
 */
router.post('/', asyncHandler(async (req, res) => {
  let { type, title, url, source } = req.body
  const { content, rating, tags = [], attachments = [] } = req.body

  // 自动分析逻辑
  let hasUrl = url || (content && /(https?:\/\/[^\s]+)/.test(content))

  // 如果传入的 url 为空，但内容里有 URL，则提取出来作为 url
  if (!url && content) {
    const urlMatch = content.match(/(https?:\/\/[^\s]+)/)
    if (urlMatch) {
      url = urlMatch[0]
      hasUrl = true
    }
  }

  // source 字段逻辑：如果没传 source，但有 url，则默认 source = url
  if (!source && url) {
    source = url
  }

  const isTitleUnreasonable = !title || title.trim() === '' ||
    ['untitled', 'new note', 'no title', '未命名', '无标题'].includes(title.toLowerCase().trim()) ||
    title.length < 2

  let aiSummary = ''
  if (hasUrl && isTitleUnreasonable) {
    try {
      const aiResult = await analyzeContent(content || '', url)
      if (aiResult) {
        if (aiResult.title && aiResult.title !== '无标题') title = aiResult.title
        if (aiResult.url && !url) url = aiResult.url
        if (aiResult.url && !source) source = aiResult.url

        if (!type || type === '其他') type = aiResult.type
        if (aiResult.summary) aiSummary = aiResult.summary
      }
    } catch (e) {
      logger.error('Auto-analyze failed:', e)
    }
  }

  if (!type || !title) {
    return validationError(res, 'Type and title are required')
  }

  // 使用 AI 摘要（如果手动摘要缺失）
  let { summary } = req.body
  if (!summary) summary = aiSummary

  const result = await run(
    `INSERT INTO contents (user_id, type, title, content, summary, url, source, rating, attachments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, type, title, content || '', summary || null, url || '', source || '', rating || null, attachments.length > 0 ? JSON.stringify(attachments) : null]
  )

  const contentId = result.lastID

  // 处理标签
  if (tags.length > 0) {
    const placeholders = tags.map(() => '?').join(', ')
    const validTags = await query(
      `SELECT id FROM tags WHERE id IN (${placeholders}) AND user_id = ?`,
      [...tags, req.user.id]
    )
    for (const tag of validTags) {
      await run(
        'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
        [contentId, tag.id]
      )
    }
  }

  return success(res, { id: contentId }, 'Content created successfully', 201)
}))

/**
 * PUT /api/contents/:id
 * 更新内容
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  const { type, title, content, summary, url, source, rating, tags, attachments } = req.body

  const existing = await verifyContentOwnership(id, req.user.id)
  if (!existing) {
    return notFound(res, 'Content not found')
  }

  const updates = []
  const params = []

  if (type !== undefined) {
    updates.push('type = ?')
    params.push(type)
  }
  if (title !== undefined) {
    updates.push('title = ?')
    params.push(title)
  }
  if (content !== undefined) {
    updates.push('content = ?')
    params.push(content)
  }
  if (summary !== undefined) {
    updates.push('summary = ?')
    params.push(summary)
  }
  if (url !== undefined) {
    updates.push('url = ?')
    params.push(url)
  }
  if (source !== undefined) {
    updates.push('source = ?')
    params.push(source)
  } else if (url !== undefined && url !== null && url !== '') {
    updates.push('source = ?')
    params.push(url)
  }
  if (rating !== undefined) {
    updates.push('rating = ?')
    params.push(rating)
  }
  if (attachments !== undefined) {
    updates.push('attachments = ?')
    params.push(attachments && attachments.length > 0 ? JSON.stringify(attachments) : null)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id, req.user.id)

  if (updates.length > 0) {
    await run(
      `UPDATE contents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    )
  }

  // 格式优化：如果内容发生了变化，自动优化格式
  let contentWasOptimized = false
  if (content !== undefined && content !== existing.content) {
    try {
      logger.info(`Starting format optimization for content ${id}`)
      const optimizedContent = await optimizeContentFormat(content)

      if (optimizedContent && optimizedContent !== content) {
        await run(
          'UPDATE contents SET content = ? WHERE id = ? AND user_id = ?',
          [optimizedContent, id, req.user.id]
        )
        logger.info(`Content ${id} format optimized successfully`)
        contentWasOptimized = true
      }
    } catch (optimizeError) {
      logger.error(`Format optimization failed for content ${id}:`, optimizeError)
    }
  }

  // 更新标签
  if (tags !== undefined) {
    await updateContentTags(id, tags.map(tagId => {
      // 如果是标签 ID，需要先查询标签名称
      // 这里假设 tags 是标签 ID 数组
      return tagId
    }), req.user.id)
  }

  return success(res, {
    optimized: contentWasOptimized
  }, 'Content updated successfully')
}))

/**
 * DELETE /api/contents/:id
 * 软删除内容
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params

  const deleted = await softDeleteContent(id, req.user.id)

  if (!deleted) {
    return notFound(res, 'Content not found')
  }

  return success(res, null, 'Content deleted successfully')
}))

/**
 * POST /api/contents/:id/favorite
 * 切换收藏状态
 */
router.post('/:id/favorite', asyncHandler(async (req, res) => {
  const { id } = req.params

  const newFavoriteStatus = await toggleFavoriteService(id, req.user.id)

  return success(res, {
    is_favorite: newFavoriteStatus
  }, 'Favorite status updated successfully')
}))

/**
 * POST /api/contents/:id/access
 * 记录访问
 */
router.post('/:id/access', asyncHandler(async (req, res) => {
  const { id } = req.params

  const content = await verifyContentOwnership(id, req.user.id)
  if (!content) {
    return notFound(res, 'Content not found')
  }

  await logContentAccess(id, req.user.id)

  return success(res, null, 'Access logged successfully')
}))

export default router
