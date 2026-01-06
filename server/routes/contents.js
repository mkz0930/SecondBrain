import express from 'express'
import { query, queryOne, run } from '../models/database.js'

const router = express.Router()

// 获取内容列表
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
      limit = 20
    } = req.query

    const offset = (page - 1) * limit
    const params = []
    let whereClauses = []

    // 类型筛选
    if (type) {
      whereClauses.push('c.type = ?')
      params.push(type)
    }

    // 收藏筛选
    if (is_favorite !== undefined && is_favorite !== null) {
      whereClauses.push('c.is_favorite = ?')
      params.push(is_favorite === 'true' || is_favorite === true ? 1 : 0)
    }

    // 搜索
    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.content LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }

    // 标签筛选
    if (tag) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM content_tags ct
        JOIN tags t ON ct.tag_id = t.id
        WHERE ct.content_id = c.id AND t.name = ?
      )`)
      params.push(tag)
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    // 查询总数
    const countSql = `SELECT COUNT(*) as total FROM contents c ${whereClause}`
    const countResult = await queryOne(countSql, params)
    const total = countResult.total

    // 查询列表
    const sql = `
      SELECT c.* FROM contents c
      ${whereClause}
      ORDER BY c.${sort} ${order}
      LIMIT ? OFFSET ?
    `
    const contents = await query(sql, [...params, parseInt(limit), parseInt(offset)])

    // 为每个内容添加标签信息
    for (let content of contents) {
      const tags = await query(
        `SELECT t.* FROM tags t
         JOIN content_tags ct ON t.id = ct.tag_id
         WHERE ct.content_id = ?`,
        [content.id]
      )
      content.tags = tags
      content.is_favorite = Boolean(content.is_favorite)
    }

    res.json({
      data: contents,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    console.error('Get contents error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 获取单个内容详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const content = await queryOne('SELECT * FROM contents WHERE id = ?', [id])
    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    // 获取标签
    const tags = await query(
      `SELECT t.* FROM tags t
       JOIN content_tags ct ON t.id = ct.tag_id
       WHERE ct.content_id = ?`,
      [id]
    )

    // 获取批注
    const annotations = await query(
      'SELECT * FROM annotations WHERE content_id = ? ORDER BY created_at DESC',
      [id]
    )

    // 获取访问次数
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

// 创建内容
router.post('/', async (req, res) => {
  try {
    const { type, title, content, source, rating, tags = [] } = req.body

    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' })
    }

    // 插入内容
    const result = await run(
      `INSERT INTO contents (type, title, content, source, rating)
       VALUES (?, ?, ?, ?, ?)`,
      [type, title, content || '', source || '', rating || null]
    )

    const contentId = result.lastID

    // 关联标签
    if (tags.length > 0) {
      for (let tagId of tags) {
        await run(
          'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
          [contentId, tagId]
        )
      }
    }

    res.status(201).json({ id: contentId, message: 'Content created successfully' })
  } catch (error) {
    console.error('Create content error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新内容
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { type, title, content, source, rating, tags } = req.body

    // 检查内容是否存在
    const existing = await queryOne('SELECT * FROM contents WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' })
    }

    // 更新内容
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
    params.push(id)

    if (updates.length > 0) {
      await run(
        `UPDATE contents SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }

    // 更新标签
    if (tags !== undefined) {
      // 删除旧的标签关联
      await run('DELETE FROM content_tags WHERE content_id = ?', [id])
      
      // 添加新的标签关联
      if (tags.length > 0) {
        for (let tagId of tags) {
          await run(
            'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
            [id, tagId]
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

// 删除内容
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const existing = await queryOne('SELECT * FROM contents WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: 'Content not found' })
    }

    await run('DELETE FROM contents WHERE id = ?', [id])

    res.json({ message: 'Content deleted successfully' })
  } catch (error) {
    console.error('Delete content error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 切换收藏状态
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params

    const content = await queryOne('SELECT * FROM contents WHERE id = ?', [id])
    if (!content) {
      return res.status(404).json({ error: 'Content not found' })
    }

    const newFavoriteStatus = content.is_favorite ? 0 : 1
    await run('UPDATE contents SET is_favorite = ? WHERE id = ?', [newFavoriteStatus, id])

    res.json({
      is_favorite: Boolean(newFavoriteStatus),
      message: 'Favorite status updated successfully'
    })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 记录访问日志
router.post('/:id/access', async (req, res) => {
  try {
    const { id } = req.params

    const content = await queryOne('SELECT * FROM contents WHERE id = ?', [id])
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
