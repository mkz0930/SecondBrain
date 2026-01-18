
import dotenv from 'dotenv';
dotenv.config();

import { SyncService } from '../server/services/sync-service.js';
import { run, queryOne } from '../server/models/database.js';

// Mock logger
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error
};

async function testAiSync() {
  console.log('Starting AI Sync Test...');

  if (!process.env.GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_API_KEY is missing in .env');
    return;
  }

  // Initialize SyncService with dummy config
  const syncService = new SyncService({
    user_id: 1, // Assuming user 1 exists
    table_id: 'app_token_table_id',
    app_id: 'test_app_id',
    app_secret: 'test_secret'
  }, logger);

  // Mock Feishu Record
  // We use a real URL to test scraping and AI summary
  const testUrl = 'https://example.com'; 
  const mockRecord = {
    record_id: 'rec_' + Date.now(),
    fields: {
      '记录ID': null, // No local ID means it's new
      '标题': 'Test Page',
      '来源': { link: testUrl, text: testUrl },
      '内容类型': '文章'
    }
  };

  console.log('Testing createLocalContents with record:', mockRecord);

  try {
    // We only test createLocalContents directly to avoid full sync complexity
    const stats = await syncService.createLocalContents([mockRecord]);
    
    console.log('Sync Stats:', stats);

    if (stats.success > 0) {
      const details = stats.details[0];
      const contentId = details.content_id;
      
      console.log(`Created content ID: ${contentId}`);

      // Verify DB content
      const savedContent = await queryOne('SELECT * FROM contents WHERE id = ?', [contentId]);
      
      console.log('Saved Content:', {
        title: savedContent.title,
        summary: savedContent.summary,
        type: savedContent.type,
        content_length: savedContent.content ? savedContent.content.length : 0
      });

      if (savedContent.summary && savedContent.summary.length > 0) {
        console.log('✅ AI Summary generated successfully.');
      } else {
        console.error('❌ AI Summary missing.');
      }

      if (savedContent.content && savedContent.content.includes('Example Domain')) {
         console.log('✅ URL Content scraped successfully.');
      } else {
         console.log('⚠️ URL Content scraping might have failed or content is different (check content_length).');
      }
      
      // Cleanup
      console.log('Cleaning up...');
      await run('DELETE FROM contents WHERE id = ?', [contentId]);
      await run('DELETE FROM feishu_sync_mapping WHERE content_id = ?', [contentId]);
      await run('DELETE FROM content_tags WHERE content_id = ?', [contentId]);

    } else {
      console.error('❌ Failed to create local content.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAiSync();
