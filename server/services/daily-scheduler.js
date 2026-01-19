import cron from 'node-cron';
import { dailySummaryService } from './daily-summary-service.js';

export function startDailyScheduler() {
  console.log('[DailyScheduler] Initializing daily tasks...');

  // Schedule task for 8 PM (20:00) every day
  cron.schedule('0 20 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[DailyScheduler] Running daily summary task for ${today} at 20:00`);
    try {
      await dailySummaryService.generateSummary(today);
    } catch (error) {
      console.error('[DailyScheduler] Failed to generate daily summary:', error);
    }
  });

  // Schedule task for midnight (00:00) every day
  cron.schedule('0 0 * * *', async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[DailyScheduler] Running daily summary task for ${today} at 00:00`);
    try {
      await dailySummaryService.generateSummary(today);
    } catch (error) {
      console.error('[DailyScheduler] Failed to generate daily summary:', error);
    }
  });

  console.log('[DailyScheduler] Tasks scheduled for 20:00 and 00:00 daily.');
}
