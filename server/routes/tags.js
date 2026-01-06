import express from 'express'
import { query, run } from '../models/database.js'

const router = express.Router()

// 获取标签列表
router.get('/', async (req, res) => {
  try {
    const tags = await query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM content_tags ct WHERE ct.tag_id = t.id) as count
      FROM tags t
      ORDER BY t.created_at DESC
    `)

    res.json({ data: tags })
  } catch (error) {
    console.error('Get tags error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 创建标签
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // 检查标签名称是否已存在
    const existing = await query('SELECT * FROM tags WHERE name = ?', [name])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Tag name already exists' })
    }

    const result = await run(
      'INSERT INTO tags (name, color) VALUES (?, ?)',
      [name, color || null]
    )

    res.status(201).json({
      id: result.lastID,
      message: 'Tag created successfully'
    })
  } catch (error) {
    console.error('Create tag error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
