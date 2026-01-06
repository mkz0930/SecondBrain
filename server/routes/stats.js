import express from 'express'
import { query, queryOne } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'

const router = express.Router()
router.use(requireUser)

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const totalContents = await queryOne(
      'SELECT COUNT(*) as count FROM contents WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    )

    const contentsByType = await query(
      `SELECT type, COUNT(*) as count
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL
       GROUP BY type`,
      [userId]
    )

    const contentsByTypeObj = {}
    contentsByType.forEach(item => {
      contentsByTypeObj[item.type] = item.count
    })

    const totalTags = await queryOne('SELECT COUNT(*) as count FROM tags WHERE user_id = ?', [userId])

    const favoriteCount = await queryOne(
      'SELECT COUNT(*) as count FROM contents WHERE user_id = ? AND deleted_at IS NULL AND is_favorite = 1',
      [userId]
    )

    const recentAccessed = await query(
      `SELECT c.*, MAX(al.accessed_at) as last_accessed
       FROM contents c
       JOIN access_logs al ON c.id = al.content_id
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY last_accessed DESC
       LIMIT 10`,
      [userId]
    )

    const mostAccessed = await query(
      `SELECT c.*, COUNT(al.id) as access_count
       FROM contents c
       JOIN access_logs al ON c.id = al.content_id
       WHERE c.user_id = ? AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY access_count DESC
       LIMIT 10`,
      [userId]
    )

    res.json({
      total_contents: totalContents.count,
      contents_by_type: contentsByTypeObj,
      total_tags: totalTags.count,
      favorite_count: favoriteCount.count,
      recent_accessed: recentAccessed,
      most_accessed: mostAccessed
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
