import express from 'express'
import { query, queryOne, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'

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
      SELECT c.* FROM contents c
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

    const accessCount = await queryOne(
      'SELECT COUNT(*) as count FROM access_logs WHERE content_id = ?',
      [id]
    )

    content.tags = tags
    content.annotations = annotations
    content.access_count = accessCount.count
    content.is_favorite = Boolean(content.is_favorite)

    res.json(content)
  } catch (error) {
    console.error('Get content error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { type, title, content, source, rating, tags = [] } = req.body

    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' })
    }

    const result = await run(
      `INSERT INTO contents (user_id, type, title, content, source, rating)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, title, content || '', source || '', rating || null]
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
    const { type, title, content, source, rating, tags } = req.body

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
