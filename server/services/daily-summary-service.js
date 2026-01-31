import { query, run, queryOne } from '../models/database.js'
import { generateDailySummary } from './ai-service.js'

export class DailySummaryService {
  /**
   * Get summary for a specific date
   * @param {string} date YYYY-MM-DD
   */
  async getSummary(date) {
    return await queryOne('SELECT * FROM daily_summaries WHERE date = ?', [date])
  }

  /**
   * Generate or regenerate summary for a specific date
   * @param {string} date YYYY-MM-DD
   */
  async generateSummary(date) {
    console.log(`[DailySummary] Generating summary for ${date}...`)
    
    // 1. Fetch contents for the date (created or updated on this date)
    // Use localtime to align with user's timezone (assuming server is configured or sqlite handles it)
    // This ensures contents created or updated on 'YYYY-MM-DD' in local time are selected.
    const contents = await query(
      `SELECT DISTINCT title, summary, content FROM contents
       WHERE (date(created_at, 'localtime') = date(?) OR date(updated_at, 'localtime') = date(?))
       AND deleted_at IS NULL
       AND (title IS NOT NULL AND title != '' OR content IS NOT NULL AND content != '')`,
      [date, date]
    )

    if (contents.length === 0) {
      console.log(`[DailySummary] No contents found for ${date}`)
      return null
    }

    // 2. Call AI Service
    const summaryText = await generateDailySummary(contents)

    if (!summaryText) {
      console.warn(`[DailySummary] AI failed to generate summary for ${date}`)
      return null
    }

    // 3. Save to DB
    const existing = await this.getSummary(date)
    if (existing) {
      await run(
        'UPDATE daily_summaries SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?',
        [summaryText, date]
      )
    } else {
      await run(
        'INSERT INTO daily_summaries (date, summary) VALUES (?, ?)',
        [date, summaryText]
      )
    }

    console.log(`[DailySummary] Summary generated for ${date}`)
    return { date, summary: summaryText }
  }

  /**
   * Initialize summaries for all past days that have content but no summary
   */
  async initializeAll() {
    console.log('[DailySummary] Starting initialization...')
    
    // Get all dates that have content
    const datesWithContent = await query(
      `SELECT DISTINCT date(created_at) as date 
       FROM contents 
       WHERE deleted_at IS NULL 
       ORDER BY date DESC`
    )

    let count = 0
    for (const { date } of datesWithContent) {
      if (!date) continue // Skip invalid dates

      const existing = await this.getSummary(date)
      if (!existing) {
        await this.generateSummary(date)
        count++
        // Add a small delay to avoid hitting rate limits too hard
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    
    console.log(`[DailySummary] Initialization complete. Generated ${count} summaries.`)
    return count
  }
}

export const dailySummaryService = new DailySummaryService()
