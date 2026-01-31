import express from 'express'
import { query, queryOne, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'
import { analyzeContent, analyzeContentSmart, optimizeContentFormat } from '../services/ai-service.js'
import logger from '../utils/logger.js'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

const router = express.Router()
router.use(requireUser)

function parseBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizeSort(sort) {
  const allowed = new Set(['created_at', 'updated_at', 'title', 'rating'])
  return allowed.has(sort) ? sort : 'created_at'
}

function normalizeOrder(order) {
  return order === 'asc' ? 'asc' : 'desc'
}

function computeSmartRating({ accessCount, annotationCount, isFavorite, contentLength }) {
  const accessScore = Math.min(2, Math.log2(accessCount + 1))
  const lengthScore = Math.min(1.6, Math.log10(contentLength + 1) * 1.1)
  const favoriteScore = isFavorite ? 0.8 : 0
  const annotationScore = Math.min(1, annotationCount * 0.25)
  const raw = accessScore + lengthScore + favoriteScore + annotationScore
  return Math.max(0, Math.min(5, Math.round(raw)))
}

/**
 * 检查标题是否需要修复（无意义标题）
 * @param {string} title - 标题
 * @returns {boolean} 是否需要修复
 */
function needsTitleFix(title) {
  if (!title || title.trim() === '') return true

  const trimmed = title.trim()

  // 检查是否是 URL 开头
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true

  // 检查是否是常见的无意义标题
  const invalidTitles = [
    '未命名笔记',
    '未命名',
    'New Note',
    '[image]',
    '无标题',
    '输入内容缺失',
    '解析失败',
    '-'
  ]
  if (invalidTitles.includes(trimmed)) return true

  // 检查是否以特定无意义前缀开头
  const invalidPrefixes = ['#!/bin', '原创 ', '关注前沿']
  if (invalidPrefixes.some(prefix => trimmed.startsWith(prefix))) return true

  // 检查标题是否过短（少于2个有意义字符）
  if (trimmed.length < 2) return true

  return false
}

router.get('/', async (req, res) => {
  try {
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

    const offset = (page - 1) * limit
    const params = [req.user.id]
    const whereClauses = ['c.user_id = ?']

    if (!parseBoolean(include_deleted)) {
      whereClauses.push('c.deleted_at IS NULL')
    }

    if (updated_since) {
      whereClauses.push('(c.updated_at >= ? OR c.deleted_at >= ?)')
      params.push(updated_since, updated_since)
    }

    if (type) {
      whereClauses.push('c.type = ?')
      params.push(type)
    }

    if (is_favorite !== undefined && is_favorite !== null) {
      whereClauses.push('c.is_favorite = ?')
      params.push(parseBoolean(is_favorite) ? 1 : 0)
    }

    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.content LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }

    if (tag) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM content_tags ct
        JOIN tags t ON ct.tag_id = t.id
        WHERE ct.content_id = c.id AND t.name = ? AND t.user_id = ?
      )`)
      params.push(tag, req.user.id)
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countSql = `SELECT COUNT(*) as total FROM contents c ${whereClause}`
    const countResult = await queryOne(countSql, params)
    const total = countResult.total

    const sql = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM access_logs al WHERE al.content_id = c.id) as access_count,
        (SELECT COUNT(*) FROM annotations an WHERE an.content_id = c.id) as annotation_count,
        length(COALESCE(c.title, '')) + length(COALESCE(c.content, '')) as content_length
      FROM contents c
      ${whereClause}
      ORDER BY c.${normalizeSort(sort)} ${normalizeOrder(order)}
      LIMIT ? OFFSET ?
    `
    const contents = await query(sql, [...params, parseInt(limit, 10), parseInt(offset, 10)])

    for (const content of contents) {
      const tags = await query(
        `SELECT t.* FROM tags t
         JOIN content_tags ct ON t.id = ct.tag_id
         WHERE ct.content_id = ? AND t.user_id = ?`,
        [content.id, req.user.id]
      )
      content.tags = tags
      content.is_favorite = Boolean(content.is_favorite)
      const accessCount = Number(content.access_count) || 0
      const annotationCount = Number(content.annotation_count) || 0
      const contentLength = Number(content.content_length) || 0
      content.smart_rating = computeSmartRating({
        accessCount,
        annotationCount,
        isFavorite: content.is_favorite,
        contentLength
      })
    }

    res.json({
      data: contents,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    })
  } catch (error) {
    console.error('Get contents error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const includeDeleted = parseBoolean(req.query.include_deleted)

    const content = await queryOne(
      `SELECT * FROM contents WHERE id = ? AND user_id = ?${includeDeleted ? '' : ' AND deleted_at IS NULL'}`,
      [id, req.user.id]
    )
    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    const tags = await query(
      `SELECT t.* FROM tags t
       JOIN content_tags ct ON t.id = ct.tag_id
       WHERE ct.content_id = ? AND t.user_id = ?`,
      [id, req.user.id]
    )

    const annotations = await query(
      'SELECT * FROM annotations WHERE content_id = ? ORDER BY created_at DESC',
      [id]
    )

    const accessCountRow = await queryOne(
      'SELECT COUNT(*) as count FROM access_logs WHERE content_id = ?',
      [id]
    )

    content.tags = tags
    content.annotations = annotations
    const accessCount = Number(accessCountRow.count) || 0
    content.access_count = accessCount
    content.is_favorite = Boolean(content.is_favorite)
    content.annotation_count = annotations.length
    content.content_length = (content.title || '').length + (content.content || '').length
    content.smart_rating = computeSmartRating({
      accessCount,
      annotationCount: content.annotation_count,
      isFavorite: content.is_favorite,
      contentLength: content.content_length
    })

    res.json(content)
  } catch (error) {
    console.error('Get content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/analyze', async (req, res) => {
  try {
    const { content } = req.body
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }
    const result = await analyzeContent(content)
    if (!result) {
      return res.status(503).json({ error: 'AI Service unavailable (Check API Key)' })
    }
    res.json(result)
  } catch (error) {
    console.error('Analyze content error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 重新分析已有内容（支持图片分析）
router.post('/:id/reanalyze', async (req, res) => {
  try {
    const { id } = req.params

    // 获取内容
    const content = await queryOne(
      'SELECT * FROM contents WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )

    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    // 解析附件
    let attachments = []
    if (content.attachments) {
      try {
        attachments = JSON.parse(content.attachments)
      } catch (e) {
        logger.warn(`Failed to parse attachments for content ${id}`)
      }
    }

    logger.info(`[重新分析] 开始分析内容 ${id}，附件数量: ${attachments.length}`)

    // 使用智能分析（支持图片）
    const aiResult = await analyzeContentSmart(content.content || '', content.url || content.source, attachments)

    if (!aiResult) {
      return res.status(503).json({ error: 'AI Service unavailable' })
    }

    // 更新内容
    const updates = {
      title: aiResult.title || content.title,
      summary: aiResult.summary || content.summary,
      type: aiResult.type || content.type,
      content: aiResult.content || content.content
    }

    // 如果 AI 提取了 URL，更新 source
    if (aiResult.url && !content.source) {
      updates.source = aiResult.url
    }

    await run(
      `UPDATE contents SET title = ?, summary = ?, type = ?, content = ?, source = COALESCE(?, source), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updates.title, updates.summary, updates.type, updates.content, updates.source || null, id, req.user.id]
    )

    // 处理 AI 生成的标签
    if (aiResult.tags && aiResult.tags.length > 0) {
      for (const tagName of aiResult.tags) {
        let tag = await queryOne(
          'SELECT id FROM tags WHERE name = ? AND user_id = ?',
          [tagName, req.user.id]
        )

        if (!tag) {
          const tagResult = await run(
            'INSERT INTO tags (name, user_id) VALUES (?, ?)',
            [tagName, req.user.id]
          )
          tag = { id: tagResult.lastID }
        }

        const existing = await queryOne(
          'SELECT 1 FROM content_tags WHERE content_id = ? AND tag_id = ?',
          [id, tag.id]
        )
        if (!existing) {
          await run(
            'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
            [id, tag.id]
          )
        }
      }
    }

    logger.info(`[重新分析] 内容 ${id} 分析完成，新标题: ${updates.title}`)

    res.json({
      success: true,
      message: '重新分析完成',
      data: {
        id: parseInt(id),
        ...updates,
        tags: aiResult.tags || [],
        isImageAnalysis: aiResult.isImageAnalysis || false
      }
    })
  } catch (error) {
    logger.error('Reanalyze content error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 新端点：获取并解析 URL 内容
router.post('/fetch-url', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    logger.info(`Fetching URL: ${url}`)

    // 获取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000,
      maxRedirects: 5
    })

    // 使用 Readability 提取主要内容
    const dom = new JSDOM(response.data, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      logger.warn(`Failed to parse article from URL: ${url}`)
      return res.status(400).json({ error: '无法解析文章内容，可能不是有效的文章页面' })
    }

    logger.info(`Successfully fetched and parsed URL: ${url}`)

    res.json({
      title: article.title || '',
      content: article.textContent || '',
      excerpt: article.excerpt || '',
      html: article.content || '',
      author: article.byline || '',
      siteName: article.siteName || ''
    })
  } catch (error) {
    logger.error('Fetch URL error:', error)

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({ error: '无法访问该 URL，请检查网络连接或 URL 是否正确' })
    }
    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: '请求超时，请稍后重试' })
    }

    res.status(500).json({ error: error.message || '获取内容失败' })
  }
})

// 新端点：快速保存（获取 + 分析 + 保存）
router.post('/quick-save', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    logger.info(`Quick save URL: ${url}`)

    // 步骤 1: 获取内容
    let fetchedContent, fetchedTitle
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000,
        maxRedirects: 5
      })

      const dom = new JSDOM(response.data, { url })
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      if (article) {
        fetchedContent = article.textContent || ''
        fetchedTitle = article.title || ''
      } else {
        // 如果 Readability 失败，使用 URL 作为内容
        fetchedContent = url
        fetchedTitle = 'New Note'
      }
    } catch (fetchError) {
      logger.warn(`Failed to fetch URL content: ${fetchError.message}`)
      // 获取失败时，使用 URL 作为内容
      fetchedContent = url
      fetchedTitle = 'New Note'
    }

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

    // 步骤 5: 处理标签（如果 AI 返回了标签）
    if (aiResult && aiResult.tags && aiResult.tags.length > 0) {
      for (const tagName of aiResult.tags) {
        // 查找或创建标签
        let tag = await queryOne(
          'SELECT id FROM tags WHERE name = ? AND user_id = ?',
          [tagName, req.user.id]
        )

        if (!tag) {
          // 创建新标签
          const tagResult = await run(
            'INSERT INTO tags (name, user_id) VALUES (?, ?)',
            [tagName, req.user.id]
          )
          tag = { id: tagResult.lastID }
        }

        // 关联标签
        await run(
          'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
          [contentId, tag.id]
        )
      }
    }

    logger.info(`Quick save successful: content ID ${contentId}`)

    res.status(201).json({
      id: contentId,
      title,
      summary,
      type,
      tags: (aiResult && aiResult.tags) ? aiResult.tags : [],
      message: 'Content saved successfully'
    })
  } catch (error) {
    logger.error('Quick save error:', error)
    res.status(500).json({ error: error.message || '保存失败' })
  }
})

// 新端点：批量保存
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' })
    }

    if (items.length > 50) {
      return res.status(400).json({ error: '单次最多批量保存 50 条' })
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
        let fetchedContent, fetchedTitle
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000,
            maxRedirects: 5
          })

          const dom = new JSDOM(response.data, { url })
          const reader = new Readability(dom.window.document)
          const article = reader.parse()

          if (article) {
            fetchedContent = article.textContent || ''
            fetchedTitle = article.title || ''
          } else {
            fetchedContent = url
            fetchedTitle = 'New Note'
          }
        } catch (fetchError) {
          fetchedContent = url
          fetchedTitle = 'New Note'
        }

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
          for (const tagName of aiResult.tags) {
            let tag = await queryOne(
              'SELECT id FROM tags WHERE name = ? AND user_id = ?',
              [tagName, req.user.id]
            )

            if (!tag) {
              const tagResult = await run(
                'INSERT INTO tags (name, user_id) VALUES (?, ?)',
                [tagName, req.user.id]
              )
              tag = { id: tagResult.lastID }
            }

            await run(
              'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
              [contentId, tag.id]
            )
          }
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

    res.json({
      results,
      total: items.length,
      success: successCount,
      failed: items.length - successCount
    })
  } catch (error) {
    logger.error('Batch save error:', error)
    res.status(500).json({ error: error.message || '批量保存失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    let { type, title, content, url, source, rating, tags = [], attachments = [] } = req.body

    // Auto-Analyze logic
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
                                ['untitled', 'new note', 'no title', '未命名', '无标题', 'image', '图片'].includes(title.toLowerCase().trim()) ||
                                title.length < 2

    let aiSummary = ''
    let aiTags = []

    // 使用智能分析：支持纯图片内容和普通内容
    if (isTitleUnreasonable || (attachments.length > 0 && (!content || content.trim().length < 10))) {
      try {
        // 使用智能分析，自动检测图片内容
        const aiResult = await analyzeContentSmart(content || '', url, attachments)
        if (aiResult) {
          if (aiResult.title && aiResult.title !== '无标题') title = aiResult.title
          // AI 分析返回的 url 也可以回填到 url/source
          if (aiResult.url && !url) url = aiResult.url
          if (aiResult.url && !source) source = aiResult.url

          if (!type || type === '其他') type = aiResult.type
          if (aiResult.summary) aiSummary = aiResult.summary
          if (aiResult.tags && aiResult.tags.length > 0) aiTags = aiResult.tags

          // 如果是图片分析，用 AI 生成的内容替换原内容
          if (aiResult.isImageAnalysis && aiResult.content) {
            content = aiResult.content
            logger.info(`[内容创建] 图片分析完成，标题: ${title}`)
          }
        }
      } catch (e) {
        logger.error('Auto-analyze failed:', e)
      }
    }

    if (!type || !title) {
      // Fallback if AI failed or no URL
      return res.status(400).json({ error: 'Type and title are required' })
    }

    // Extract summary from body if we want to support manual summary too
    let { summary } = req.body
    // Use AI summary if manual summary is missing
    if (!summary) summary = aiSummary

    const result = await run(
      `INSERT INTO contents (user_id, type, title, content, summary, url, source, rating, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, title, content || '', summary || null, url || '', source || '', rating || null, attachments.length > 0 ? JSON.stringify(attachments) : null]
    )

    const contentId = result.lastID

    // 处理用户传入的标签 ID
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

    // 处理 AI 生成的标签名称
    if (aiTags.length > 0) {
      for (const tagName of aiTags) {
        // 查找或创建标签
        let tag = await queryOne(
          'SELECT id FROM tags WHERE name = ? AND user_id = ?',
          [tagName, req.user.id]
        )

        if (!tag) {
          // 创建新标签
          const tagResult = await run(
            'INSERT INTO tags (name, user_id) VALUES (?, ?)',
            [tagName, req.user.id]
          )
          tag = { id: tagResult.lastID }
        }

        // 检查是否已关联
        const existing = await queryOne(
          'SELECT 1 FROM content_tags WHERE content_id = ? AND tag_id = ?',
          [contentId, tag.id]
        )
        if (!existing) {
          await run(
            'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
            [contentId, tag.id]
          )
        }
      }
    }

    res.status(201).json({ id: contentId, message: 'Content created successfully' })
  } catch (error) {
    console.error('Create content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { type, title, content, summary, url, source, rating, tags, attachments } = req.body

    // Auto-Analyze logic for PUT if content/url changed or explicitly requested
    // (Wait, PUT usually sends what changed. If title is not sent, we keep old title.)
    // But if user sends a URL update, we might want to re-analyze?
    // Let's stick to user request: "When retrieved content" -> usually implies creation or fetching.
    // But if the user edits the content to add a URL, they might expect it to work.
    // However, PUT semantics are "replace".
    // Let's only apply this logic if:
    // 1. url is being updated OR content is being updated with a URL
    // 2. AND title is missing from the update (so we can't check if it's "unreasonable" easily without fetching old one, but we can assume if they don't send title, they want to keep old one. If they send "New Note", we replace it.)
    
    // Simplification: Let's only do it for POST for now as per "When retrieved content" usually implies the initial fetch.
    // Unless the user explicitly asks for it on update.
    // But let's leave PUT as is for now to avoid overwriting user edits unexpectedly.
    
    const existing = await queryOne(
      'SELECT * FROM contents WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    )
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' })
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
      // 如果没有传 source，但传了 url，且 url 不为空，则自动将 source 设置为 url
      // 仅当数据库中 source 为空时？或者总是？
      // 为了保持一致性，如果 source 没传，就默认用 url。
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

        // 如果优化后的内容与原内容不同，更新数据库
        if (optimizedContent && optimizedContent !== content) {
          await run(
            'UPDATE contents SET content = ? WHERE id = ? AND user_id = ?',
            [optimizedContent, id, req.user.id]
          )
          logger.info(`Content ${id} format optimized successfully`)
          contentWasOptimized = true
        }
      } catch (optimizeError) {
        // 优化失败不影响保存，只记录错误
        logger.error(`Format optimization failed for content ${id}:`, optimizeError)
      }
    }

    // 自动修复无意义标题：检查更新后的标题是否需要修复
    let titleWasFixed = false
    const currentTitle = title !== undefined ? title : existing.title
    const currentContent = content !== undefined ? content : existing.content
    const currentUrl = url !== undefined ? url : existing.url

    if (needsTitleFix(currentTitle) && currentContent) {
      try {
        logger.info(`[标题修复] 检测到无意义标题 "${currentTitle}"，开始 AI 分析...`)
        const aiResult = await analyzeContent(currentContent, currentUrl)

        if (aiResult && aiResult.title && !needsTitleFix(aiResult.title)) {
          await run(
            'UPDATE contents SET title = ? WHERE id = ? AND user_id = ?',
            [aiResult.title, id, req.user.id]
          )
          logger.info(`[标题修复] 内容 ${id} 标题已修复: "${aiResult.title}"`)
          titleWasFixed = true
        }
      } catch (titleError) {
        logger.error(`[标题修复] 内容 ${id} 标题修复失败:`, titleError)
      }
    }

    if (tags !== undefined) {
      await run('DELETE FROM content_tags WHERE content_id = ?', [id])

      if (tags.length > 0) {
        const placeholders = tags.map(() => '?').join(', ')
        const validTags = await query(
          `SELECT id FROM tags WHERE id IN (${placeholders}) AND user_id = ?`,
          [...tags, req.user.id]
        )
        for (const tag of validTags) {
          await run(
            'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
            [id, tag.id]
          )
        }
      }
    }

    res.json({
      message: 'Content updated successfully',
      optimized: contentWasOptimized,
      titleFixed: titleWasFixed
    })
  } catch (error) {
    console.error('Update content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const existing = await queryOne(
      'SELECT * FROM contents WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    )
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' })
    }

    await run(
      'UPDATE contents SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )

    res.json({ message: 'Content deleted successfully' })
  } catch (error) {
    console.error('Delete content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params

    const content = await queryOne(
      'SELECT * FROM contents WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    )
    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    const newFavoriteStatus = content.is_favorite ? 0 : 1
    await run(
      'UPDATE contents SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [newFavoriteStatus, id, req.user.id]
    )

    res.json({
      is_favorite: Boolean(newFavoriteStatus),
      message: 'Favorite status updated successfully'
    })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/access', async (req, res) => {
  try {
    const { id } = req.params

    const content = await queryOne(
      'SELECT * FROM contents WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, req.user.id]
    )
    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    await run('INSERT INTO access_logs (content_id) VALUES (?)', [id])

    res.json({ message: 'Access logged successfully' })
  } catch (error) {
    console.error('Record access error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
