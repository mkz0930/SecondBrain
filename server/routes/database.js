import express from 'express'
import { query, queryOne } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'
import logger from '../utils/logger.js'

const router = express.Router()
router.use(requireUser)

// Get database overview statistics
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id

    // Get table row counts
    const contentCount = await queryOne(
      'SELECT COUNT(*) as count FROM contents WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    )

    const deletedContentCount = await queryOne(
      'SELECT COUNT(*) as count FROM contents WHERE user_id = ? AND deleted_at IS NOT NULL',
      [userId]
    )

    const tagCount = await queryOne(
      'SELECT COUNT(*) as count FROM tags WHERE user_id = ?',
      [userId]
    )

    const contentTagCount = await queryOne(
      `SELECT COUNT(*) as count FROM content_tags ct
       JOIN contents c ON ct.content_id = c.id
       WHERE c.user_id = ?`,
      [userId]
    )

    const annotationCount = await queryOne(
      `SELECT COUNT(*) as count FROM annotations a
       JOIN contents c ON a.content_id = c.id
       WHERE c.user_id = ?`,
      [userId]
    )

    const accessLogCount = await queryOne(
      `SELECT COUNT(*) as count FROM access_logs al
       JOIN contents c ON al.content_id = c.id
       WHERE c.user_id = ?`,
      [userId]
    )

    const syncMappingCount = await queryOne(
      `SELECT COUNT(*) as count FROM feishu_sync_mapping fsm
       JOIN contents c ON fsm.content_id = c.id
       WHERE c.user_id = ?`,
      [userId]
    )

    const syncLogCount = await queryOne(
      'SELECT COUNT(*) as count FROM feishu_sync_log WHERE user_id = ?',
      [userId]
    )

    const dailySummaryCount = await queryOne(
      'SELECT COUNT(*) as count FROM daily_summaries'
    )

    const researchProjectCount = await queryOne(
      'SELECT COUNT(*) as count FROM research_projects WHERE user_id = ?',
      [userId]
    )

    res.json({
      tables: {
        contents: contentCount.count,
        deleted_contents: deletedContentCount.count,
        tags: tagCount.count,
        content_tags: contentTagCount.count,
        annotations: annotationCount.count,
        access_logs: accessLogCount.count,
        feishu_sync_mapping: syncMappingCount.count,
        feishu_sync_log: syncLogCount.count,
        daily_summaries: dailySummaryCount.count,
        research_projects: researchProjectCount.count
      }
    })
  } catch (error) {
    logger.error('Get database overview error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get sync statistics
router.get('/sync-stats', async (req, res) => {
  try {
    const userId = req.user.id

    // Get sync configuration
    const syncConfig = await queryOne(
      `SELECT enabled, sync_interval, last_sync_at, consecutive_failures
       FROM feishu_sync_config
       WHERE user_id = ?`,
      [userId]
    )

    // Get sync mapping statistics
    const mappingStats = await query(
      `SELECT sync_direction, COUNT(*) as count
       FROM feishu_sync_mapping fsm
       JOIN contents c ON fsm.content_id = c.id
       WHERE c.user_id = ?
       GROUP BY sync_direction`,
      [userId]
    )

    const mappingByDirection = {}
    mappingStats.forEach(item => {
      mappingByDirection[item.sync_direction || 'unknown'] = item.count
    })

    // Get recent sync logs
    const recentSyncs = await query(
      `SELECT id, sync_type, start_at, end_at, status, total_count,
              success_count, failed_count, conflict_count, error_message
       FROM feishu_sync_log
       WHERE user_id = ?
       ORDER BY start_at DESC
       LIMIT 10`,
      [userId]
    )

    // Get sync success rate
    const syncStats = await queryOne(
      `SELECT
         COUNT(*) as total_syncs,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_syncs,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_syncs,
         SUM(total_count) as total_records_processed,
         SUM(success_count) as total_records_succeeded,
         SUM(failed_count) as total_records_failed,
         SUM(conflict_count) as total_conflicts
       FROM feishu_sync_log
       WHERE user_id = ?`,
      [userId]
    )

    res.json({
      config: syncConfig || { enabled: false },
      mapping_by_direction: mappingByDirection,
      recent_syncs: recentSyncs,
      statistics: {
        total_syncs: syncStats.total_syncs || 0,
        successful_syncs: syncStats.successful_syncs || 0,
        failed_syncs: syncStats.failed_syncs || 0,
        success_rate: syncStats.total_syncs > 0
          ? ((syncStats.successful_syncs / syncStats.total_syncs) * 100).toFixed(2)
          : 0,
        total_records_processed: syncStats.total_records_processed || 0,
        total_records_succeeded: syncStats.total_records_succeeded || 0,
        total_records_failed: syncStats.total_records_failed || 0,
        total_conflicts: syncStats.total_conflicts || 0
      }
    })
  } catch (error) {
    logger.error('Get sync stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get content statistics
router.get('/content-stats', async (req, res) => {
  try {
    const userId = req.user.id

    // Content by type
    const contentsByType = await query(
      `SELECT type, COUNT(*) as count
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL
       GROUP BY type
       ORDER BY count DESC`,
      [userId]
    )

    // Content by source
    const contentsBySource = await query(
      `SELECT source, COUNT(*) as count
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL AND source IS NOT NULL
       GROUP BY source
       ORDER BY count DESC
       LIMIT 10`,
      [userId]
    )

    // Content by rating
    const contentsByRating = await query(
      `SELECT rating, COUNT(*) as count
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL AND rating IS NOT NULL
       GROUP BY rating
       ORDER BY rating DESC`,
      [userId]
    )

    // Content creation timeline (last 30 days)
    const contentTimeline = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL
         AND created_at >= datetime('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [userId]
    )

    // Favorite statistics
    const favoriteStats = await queryOne(
      `SELECT
         COUNT(*) as total_favorites,
         AVG(rating) as avg_rating
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL AND is_favorite = 1`,
      [userId]
    )

    // Content with summaries
    const summaryStats = await queryOne(
      `SELECT
         COUNT(*) as total_with_summary,
         COUNT(*) * 100.0 / (SELECT COUNT(*) FROM contents WHERE user_id = ? AND deleted_at IS NULL) as percentage
       FROM contents
       WHERE user_id = ? AND deleted_at IS NULL AND summary IS NOT NULL AND summary != ''`,
      [userId, userId]
    )

    res.json({
      by_type: contentsByType,
      by_source: contentsBySource,
      by_rating: contentsByRating,
      timeline: contentTimeline,
      favorites: {
        total: favoriteStats.total_favorites || 0,
        avg_rating: favoriteStats.avg_rating ? parseFloat(favoriteStats.avg_rating).toFixed(2) : 0
      },
      summaries: {
        total: summaryStats.total_with_summary || 0,
        percentage: summaryStats.percentage ? parseFloat(summaryStats.percentage).toFixed(2) : 0
      }
    })
  } catch (error) {
    logger.error('Get content stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get tag statistics
router.get('/tag-stats', async (req, res) => {
  try {
    const userId = req.user.id

    // Most used tags
    const mostUsedTags = await query(
      `SELECT t.id, t.name, t.color, COUNT(ct.content_id) as usage_count
       FROM tags t
       LEFT JOIN content_tags ct ON t.id = ct.tag_id
       LEFT JOIN contents c ON ct.content_id = c.id
       WHERE t.user_id = ? AND (c.deleted_at IS NULL OR c.id IS NULL)
       GROUP BY t.id
       ORDER BY usage_count DESC
       LIMIT 20`,
      [userId]
    )

    // Unused tags
    const unusedTags = await query(
      `SELECT t.id, t.name, t.color
       FROM tags t
       LEFT JOIN content_tags ct ON t.id = ct.tag_id
       WHERE t.user_id = ? AND ct.tag_id IS NULL`,
      [userId]
    )

    // Tag usage distribution
    const tagDistribution = await query(
      `SELECT
         CASE
           WHEN usage_count = 0 THEN '0'
           WHEN usage_count BETWEEN 1 AND 5 THEN '1-5'
           WHEN usage_count BETWEEN 6 AND 10 THEN '6-10'
           WHEN usage_count BETWEEN 11 AND 20 THEN '11-20'
           ELSE '20+'
         END as range,
         COUNT(*) as tag_count
       FROM (
         SELECT t.id, COUNT(ct.content_id) as usage_count
         FROM tags t
         LEFT JOIN content_tags ct ON t.id = ct.tag_id
         LEFT JOIN contents c ON ct.content_id = c.id
         WHERE t.user_id = ? AND (c.deleted_at IS NULL OR c.id IS NULL)
         GROUP BY t.id
       )
       GROUP BY range
       ORDER BY range`,
      [userId]
    )

    res.json({
      most_used: mostUsedTags,
      unused: unusedTags,
      distribution: tagDistribution
    })
  } catch (error) {
    logger.error('Get tag stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get research statistics
router.get('/research-stats', async (req, res) => {
  try {
    const userId = req.user.id

    // Research projects by status
    const projectsByStatus = await query(
      `SELECT status, COUNT(*) as count
       FROM research_projects
       WHERE user_id = ?
       GROUP BY status`,
      [userId]
    )

    // Recent research projects
    const recentProjects = await query(
      `SELECT id, title, description, status, created_at, updated_at
       FROM research_projects
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 10`,
      [userId]
    )

    // Research questions statistics
    const questionStats = await queryOne(
      `SELECT
         COUNT(*) as total_questions,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_questions
       FROM research_questions rq
       JOIN research_projects rp ON rq.project_id = rp.id
       WHERE rp.user_id = ?`,
      [userId]
    )

    // Research materials statistics
    const materialStats = await query(
      `SELECT type, COUNT(*) as count
       FROM research_materials rm
       JOIN research_projects rp ON rm.project_id = rp.id
       WHERE rp.user_id = ?
       GROUP BY type`,
      [userId]
    )

    res.json({
      projects_by_status: projectsByStatus,
      recent_projects: recentProjects,
      questions: {
        total: questionStats.total_questions || 0,
        completed: questionStats.completed_questions || 0
      },
      materials_by_type: materialStats
    })
  } catch (error) {
    logger.error('Get research stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get daily summary statistics
router.get('/summary-stats', async (req, res) => {
  try {
    // Recent summaries
    const recentSummaries = await query(
      `SELECT date, created_at, updated_at,
              LENGTH(summary) as summary_length
       FROM daily_summaries
       ORDER BY date DESC
       LIMIT 30`
    )

    // Summary statistics
    const summaryStats = await queryOne(
      `SELECT
         COUNT(*) as total_summaries,
         AVG(LENGTH(summary)) as avg_length,
         MIN(date) as earliest_date,
         MAX(date) as latest_date
       FROM daily_summaries`
    )

    res.json({
      recent_summaries: recentSummaries,
      statistics: {
        total: summaryStats.total_summaries || 0,
        avg_length: summaryStats.avg_length ? Math.round(summaryStats.avg_length) : 0,
        earliest_date: summaryStats.earliest_date,
        latest_date: summaryStats.latest_date
      }
    })
  } catch (error) {
    logger.error('Get summary stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
