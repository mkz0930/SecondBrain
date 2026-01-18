import 'dotenv/config'; // Load env vars
import { dailySummaryService } from '../server/services/daily-summary-service.js';
import { initDatabase } from '../server/models/database.js';

async function test() {
  console.log('Initializing database...');
  await initDatabase();

  console.log('Testing daily summary generation...');
  
  // Try to generate for today
  const today = new Date().toISOString().split('T')[0];
  console.log(`Generating for ${today}...`);
  const result = await dailySummaryService.generateSummary(today);
  console.log('Result:', result);

  // Initialize all (this will check past days)
  console.log('Initializing all past days...');
  const count = await dailySummaryService.initializeAll();
  console.log(`Initialized ${count} days.`);
}

test().catch(console.error);
