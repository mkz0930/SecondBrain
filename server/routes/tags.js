import express from 'express'
import { query, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'

const router = express.Router()
router.use(requireUser)

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const tags = await query(
      `SELECT t.*,
        (SELECT COUNT(*)
         FROM content_tags ct
         JOIN contents c ON c.id = ct.content_id
         WHERE ct.tag_id = t.id AND c.user_id = ? AND c.deleted_at IS NULL) as count
       FROM tags t
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId, userId]
    )

    res.json({ data: tags })
  } catch (error) {
    console.error('Get tags error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const existing = await query('SELECT * FROM tags WHERE name = ? AND user_id = ?', [name, req.user.id])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Tag name already exists' })
    }

    const result = await run(
      'INSERT INTO tags (name, color, user_id) VALUES (?, ?, ?)',
      [name, color || null, req.user.id]
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
