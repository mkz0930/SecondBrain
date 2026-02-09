import { Router } from 'express'
import { query, queryOne, run } from '../models/database.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * Parse Chinese time format to minutes
 * "2小时30分钟" → 150, "45分钟" → 45, "1小时" → 60
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0
  let minutes = 0
  const hourMatch = timeStr.match(/(\d+)\s*小时/)
  const minMatch = timeStr.match(/(\d+)\s*分钟/)
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60
  if (minMatch) minutes += parseInt(minMatch[1])
  return minutes
}

/**
 * Parse the daily report text from Phone Monitor Android app
 */
function parseReport(text) {
  const result = {
    date: null,
    apps: [],
    categories: [],
    totalMinutes: 0,
    appCount: 0,
    unlockCount: 0,
    device: null,
    warning: null
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // Extract date: "📅 2026-02-09 (周一)"
  for (const line of lines) {
    const dateMatch = line.match(/📅\s*(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      result.date = dateMatch[1]
      break
    }
  }

  if (!result.date) {
    // Fallback: use today's date in Shanghai timezone
    const now = new Date()
    const shanghai = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
    result.date = shanghai.toISOString().split('T')[0]
  }

  // Parse app entries
  // Formats: "🥇 📺 抖音  2小时30分钟" or " 4. 🎵 网易云音乐  30分钟"
  let rank = 0
  for (const line of lines) {
    // Medal ranks
    const medalMatch = line.match(/^(🥇|🥈|🥉)\s+(.+?)\s{2,}(.+)$/)
    if (medalMatch) {
      rank++
      const nameWithEmoji = medalMatch[2].trim()
      const timeStr = medalMatch[3].trim()
      const emojiMatch = nameWithEmoji.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u)
      const emoji = emojiMatch ? emojiMatch[1] : ''
      const appName = emojiMatch ? nameWithEmoji.slice(emojiMatch[0].length).trim() : nameWithEmoji
      result.apps.push({
        app_name: appName,
        emoji: emoji,
        minutes: parseTimeToMinutes(timeStr),
        rank: rank
      })
      continue
    }

    // Numbered ranks: " 4. 🎵 网易云音乐  30分钟"
    const numMatch = line.match(/^\s*(\d+)\.\s+(.+?)\s{2,}(.+)$/)
    if (numMatch) {
      rank = parseInt(numMatch[1])
      const nameWithEmoji = numMatch[2].trim()
      const timeStr = numMatch[3].trim()
      const emojiMatch = nameWithEmoji.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u)
      const emoji = emojiMatch ? emojiMatch[1] : ''
      const appName = emojiMatch ? nameWithEmoji.slice(emojiMatch[0].length).trim() : nameWithEmoji
      result.apps.push({
        app_name: appName,
        emoji: emoji,
        minutes: parseTimeToMinutes(timeStr),
        rank: rank
      })
      continue
    }
  }

  // Parse categories: "  🎬 娱乐: 3小时20分钟"
  let inCategories = false
  for (const line of lines) {
    if (line.includes('分类统计')) {
      inCategories = true
      continue
    }
    if (inCategories && line.startsWith('⏱')) {
      inCategories = false
    }
    if (inCategories) {
      const catMatch = line.match(/^\s*(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.+?)[:：]\s*(.+)$/u)
      if (catMatch) {
        result.categories.push({
          emoji: catMatch[1],
          category: catMatch[2].trim(),
          minutes: parseTimeToMinutes(catMatch[3])
        })
      }
    }
  }

  // Parse total: "⏱ 总计: 6小时10分钟 (8个应用)"
  for (const line of lines) {
    const totalMatch = line.match(/⏱\s*总计[:：]\s*(.+?)\s*\((\d+)个应用\)/)
    if (totalMatch) {
      result.totalMinutes = parseTimeToMinutes(totalMatch[1])
      result.appCount = parseInt(totalMatch[2])
      if (line.includes('⚠️')) result.warning = '使用较多'
      break
    }
  }

  // Parse unlock count: "🔓 解锁: 85次"
  for (const line of lines) {
    const unlockMatch = line.match(/🔓\s*解锁[:：]\s*(\d+)\s*次/)
    if (unlockMatch) {
      result.unlockCount = parseInt(unlockMatch[1])
      break
    }
  }

  // Parse device: "📱 OPPO Find N5"
  for (const line of lines) {
    const deviceMatch = line.match(/^📱\s+(.+)$/)
    if (deviceMatch && !line.includes('日报') && !line.includes('使用')) {
      result.device = deviceMatch[1].trim()
      break
    }
  }

  return result
}

/**
 * POST /api/phone-usage/ingest
 * Ingest a daily report text message
 */
router.post('/ingest', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) {
      return res.status(400).json({ error: 'Missing text field' })
    }

    const report = parseReport(text)
    if (!report.date) {
      return res.status(400).json({ error: 'Could not parse date from report' })
    }

    // Upsert daily summary
    await run(
      `INSERT INTO phone_usage_daily (date, total_minutes, unlock_count, device, raw_report)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         total_minutes = excluded.total_minutes,
         unlock_count = excluded.unlock_count,
         device = excluded.device,
         raw_report = excluded.raw_report`,
      [report.date, report.totalMinutes, report.unlockCount, report.device, text]
    )

    // Upsert app entries
    for (const app of report.apps) {
      await run(
        `INSERT INTO phone_usage_apps (date, app_name, package_name, category, minutes, emoji, rank)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, app_name) DO UPDATE SET
           minutes = excluded.minutes,
           emoji = excluded.emoji,
           rank = excluded.rank,
           category = excluded.category`,
        [report.date, app.app_name, null, null, app.minutes, app.emoji, app.rank]
      )
    }

    // Upsert category entries
    for (const cat of report.categories) {
      await run(
        `INSERT INTO phone_usage_categories (date, category, minutes, emoji)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(date, category) DO UPDATE SET
           minutes = excluded.minutes,
           emoji = excluded.emoji`,
        [report.date, cat.category, cat.minutes, cat.emoji]
      )
    }

    logger.info(`[PhoneUsage] Ingested report for ${report.date}: ${report.totalMinutes}min, ${report.apps.length} apps, ${report.categories.length} categories`)

    res.json({
      success: true,
      date: report.date,
      totalMinutes: report.totalMinutes,
      apps: report.apps.length,
      categories: report.categories.length,
      unlockCount: report.unlockCount
    })
  } catch (err) {
    logger.error('[PhoneUsage] Ingest error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/phone-usage/daily?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Return daily summaries with app details
 */
router.get('/daily', async (req, res) => {
  try {
    const { start, end } = req.query
    let sql = 'SELECT * FROM phone_usage_daily'
    const params = []

    if (start && end) {
      sql += ' WHERE date >= ? AND date <= ?'
      params.push(start, end)
    } else if (start) {
      sql += ' WHERE date >= ?'
      params.push(start)
    } else if (end) {
      sql += ' WHERE date <= ?'
      params.push(end)
    }
    sql += ' ORDER BY date DESC'

    const dailies = await query(sql, params)

    // Fetch apps for each day
    for (const day of dailies) {
      day.apps = await query(
        'SELECT * FROM phone_usage_apps WHERE date = ? ORDER BY rank ASC',
        [day.date]
      )
      day.categories = await query(
        'SELECT * FROM phone_usage_categories WHERE date = ? ORDER BY minutes DESC',
        [day.date]
      )
    }

    res.json(dailies)
  } catch (err) {
    logger.error('[PhoneUsage] Daily query error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/phone-usage/trends?days=30
 * Return daily totals for trend chart
 */
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const rows = await query(
      `SELECT date, total_minutes, unlock_count, device
       FROM phone_usage_daily
       ORDER BY date DESC
       LIMIT ?`,
      [days]
    )
    // Return in chronological order
    res.json(rows.reverse())
  } catch (err) {
    logger.error('[PhoneUsage] Trends query error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/phone-usage/categories?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Return aggregated category data for the period
 */
router.get('/categories', async (req, res) => {
  try {
    const { start, end } = req.query
    let sql = `SELECT category, emoji, SUM(minutes) as total_minutes, COUNT(DISTINCT date) as days
               FROM phone_usage_categories`
    const params = []

    if (start && end) {
      sql += ' WHERE date >= ? AND date <= ?'
      params.push(start, end)
    }
    sql += ' GROUP BY category ORDER BY total_minutes DESC'

    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    logger.error('[PhoneUsage] Categories query error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/phone-usage/stats
 * Return overall stats
 */
router.get('/stats', async (req, res) => {
  try {
    const totalDays = await queryOne('SELECT COUNT(*) as count FROM phone_usage_daily')
    const avgDaily = await queryOne('SELECT AVG(total_minutes) as avg_minutes, AVG(unlock_count) as avg_unlocks FROM phone_usage_daily')
    const topApp = await queryOne(
      `SELECT app_name, emoji, SUM(minutes) as total_minutes, COUNT(*) as days
       FROM phone_usage_apps
       GROUP BY app_name
       ORDER BY total_minutes DESC
       LIMIT 1`
    )
    const today = await queryOne(
      `SELECT * FROM phone_usage_daily WHERE date = date('now', '+8 hours')`
    )
    const maxDay = await queryOne(
      'SELECT date, total_minutes FROM phone_usage_daily ORDER BY total_minutes DESC LIMIT 1'
    )
    const minDay = await queryOne(
      'SELECT date, total_minutes FROM phone_usage_daily ORDER BY total_minutes ASC LIMIT 1'
    )

    res.json({
      totalDays: totalDays?.count || 0,
      avgDailyMinutes: Math.round(avgDaily?.avg_minutes || 0),
      avgDailyUnlocks: Math.round(avgDaily?.avg_unlocks || 0),
      topApp: topApp || null,
      today: today || null,
      maxDay: maxDay || null,
      minDay: minDay || null
    })
  } catch (err) {
    logger.error('[PhoneUsage] Stats query error:', err)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/phone-usage/top-apps?days=30&limit=10
 * Return top apps by total usage
 */
router.get('/top-apps', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const limit = parseInt(req.query.limit) || 10

    const rows = await query(
      `SELECT app_name, emoji, 
              SUM(minutes) as total_minutes, 
              ROUND(AVG(minutes), 0) as avg_minutes,
              COUNT(DISTINCT date) as days_used,
              MIN(rank) as best_rank
       FROM phone_usage_apps
       WHERE date >= date('now', '+8 hours', '-' || ? || ' days')
       GROUP BY app_name
       ORDER BY total_minutes DESC
       LIMIT ?`,
      [days, limit]
    )
    res.json(rows)
  } catch (err) {
    logger.error('[PhoneUsage] Top apps query error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
