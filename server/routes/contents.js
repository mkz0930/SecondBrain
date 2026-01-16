import express from 'express'
import { query, queryOne, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'
import { analyzeContent } from '../services/ai-service.js'

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

router.post('/', async (req, res) => {
  try {
    let { type, title, content, url, source, rating, tags = [] } = req.body

    // Auto-Analyze logic
    const hasUrl = url || (content && /(https?:\/\/[^\s]+)/.test(content));
    const isTitleUnreasonable = !title || title.trim() === '' || 
                                ['untitled', 'new note', 'no title', '未命名', '无标题'].includes(title.toLowerCase().trim()) || 
                                title.length < 2;

    let aiSummary = '';
    if (hasUrl && isTitleUnreasonable) {
        try {
            const aiResult = await analyzeContent(content || '', url);
            if (aiResult) {
                if (aiResult.title && aiResult.title !== '无标题') title = aiResult.title;
                if (aiResult.url) url = aiResult.url;
                if (!type || type === '其他') type = aiResult.type;
                if (aiResult.summary) aiSummary = aiResult.summary;
            }
        } catch (e) {
            console.error('Auto-analyze failed:', e);
        }
    }

    if (!type || !title) {
      // Fallback if AI failed or no URL
      return res.status(400).json({ error: 'Type and title are required' })
    }
    
    // Extract summary from body if we want to support manual summary too
    let { summary } = req.body;
    // Use AI summary if manual summary is missing
    if (!summary) summary = aiSummary;

    const result = await run(
      `INSERT INTO contents (user_id, type, title, content, summary, url, source, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, title, content || '', summary || null, url || '', source || '', rating || null]
    )

    const contentId = result.lastID

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

    res.status(201).json({ id: contentId, message: 'Content created successfully' })
  } catch (error) {
    console.error('Create content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    let { type, title, content, summary, url, source, rating, tags } = req.body

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
    }
    if (rating !== undefined) {
      updates.push('rating = ?')
      params.push(rating)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, req.user.id)

    if (updates.length > 0) {
      await run(
        `UPDATE contents SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      )
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

    res.json({ message: 'Content updated successfully' })
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
