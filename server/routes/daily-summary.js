import express from 'express'
import { dailySummaryService } from '../services/daily-summary-service.js'

const router = express.Router()

// Get summary for a specific date
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params
    const summary = await dailySummaryService.getSummary(date)
    res.json(summary || { summary: null })
  } catch (error) {
    console.error('Error fetching daily summary:', error)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

// Trigger generation (for testing or manual update)
router.post('/generate', async (req, res) => {
  try {
    const { date } = req.body
    const targetDate = date || new Date().toISOString().split('T')[0]
    const result = await dailySummaryService.generateSummary(targetDate)
    res.json(result)
  } catch (error) {
    console.error('Error generating summary:', error)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
})

// Initialize all past summaries
router.post('/init-all', async (req, res) => {
  try {
    // Run in background as it might take time
    dailySummaryService.initializeAll().catch(err => {
      console.error('Background initialization failed:', err)
    })
    
    res.json({ message: 'Initialization started in background' })
  } catch (error) {
    console.error('Error starting initialization:', error)
    res.status(500).json({ error: 'Failed to start initialization' })
  }
})

export default router
