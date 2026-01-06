import express from 'express'
import { query, queryOne } from '../models/database.js'

const router = express.Router()

// 获取统计信息
router.get('/', async (req, res) => {
  try {
    // 内容总数
    const totalContents = await queryOne('SELECT COUNT(*) as count FROM contents')

    // 各类型内容数量
    const contentsByType = await query(`
      SELECT type, COUNT(*) as count
      FROM contents
      GROUP BY type
    `)

    const contentsByTypeObj = {}
    contentsByType.forEach(item => {
      contentsByTypeObj[item.type] = item.count
    })

    // 标签总数
    const totalTags = await queryOne('SELECT COUNT(*) as count FROM tags')

    // 收藏内容数量
    const favoriteCount = await queryOne('SELECT COUNT(*) as count FROM contents WHERE is_favorite = 1')

    // 最近访问的内容（前10条）
    const recentAccessed = await query(`
      SELECT c.*, MAX(al.accessed_at) as last_accessed
      FROM contents c
      JOIN access_logs al ON c.id = al.content_id
      GROUP BY c.id
      ORDER BY last_accessed DESC
      LIMIT 10
    `)

    // 访问最多的内容（前10条）
    const mostAccessed = await query(`
      SELECT c.*, COUNT(al.id) as access_count
      FROM contents c
      JOIN access_logs al ON c.id = al.content_id
      GROUP BY c.id
      ORDER BY access_count DESC
      LIMIT 10
    `)

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
