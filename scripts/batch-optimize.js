
import dotenv from 'dotenv';
dotenv.config();

import { query, run, queryOne } from '../server/models/database.js';
import { analyzeContent } from '../server/services/ai-service.js';
import logger from '../server/utils/logger.js';

async function batchOptimize() {
  logger.info('Starting Batch Optimization...');

  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    logger.error('ERROR: GOOGLE_API_KEY or GEMINI_API_KEY is missing in .env');
    return;
  }

  try {
    // 1. Fetch all non-deleted contents
    const contents = await query('SELECT * FROM contents WHERE deleted_at IS NULL');
    logger.info(`Found ${contents.length} records to process.`);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < contents.length; i++) {
      const record = contents[i];
      const contentId = record.id;
      const title = record.title;
      const content = record.content;
      const source = record.source || record.url; // Use source or url as fallback

      logger.info(`[${i + 1}/${contents.length}] Processing ID: ${contentId} "${title}"...`);

      // Skip if no content and no source URL
      if ((!content || content.trim().length === 0) && (!source || !source.startsWith('http'))) {
        logger.info(`  -> Skipped: No content and no valid source URL.`);
        skippedCount++;
        continue;
      }

      // 2. Call AI Analysis
      try {
        // Use content or source as input. If content is empty, analyzeContent will try to fetch source.
        const input = content || '';
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

        let aiResult = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            aiResult = await analyzeContent(input, source);
            break; // Success
          } catch (error) {
            if (error.status === 429) {
              const waitTime = 30000 * (retries + 1); // Exponential-ish backoff: 30s, 60s, 90s
              logger.warn(`  -> Rate limit exceeded (429). Retrying in ${waitTime/1000} seconds... (Attempt ${retries + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retries++;
            } else {
              throw error; // Other error, don't retry
            }
          }
        }

        if (!aiResult) {
           logger.warn(`  -> AI returned null result after retries.`);
           failedCount++;
           continue;
        }
        
        // Check if AI actually produced something useful (not just default fallbacks)
        if (aiResult.summary === 'AI分析失败' || aiResult.summary === null) {
            logger.warn(`  -> AI analysis failed or returned empty summary.`);
            failedCount++;
            continue;
        }

        // 3. Update Database
        // We update title, summary, type. We also update content if AI fetched more (and original was empty/short).
        // We also handle tags.
        
        const updates = [];
        const params = [];

        // Always update summary and type if valid
        updates.push('summary = ?');
        params.push(aiResult.summary);

        updates.push('type = ?');
        params.push(aiResult.type);

        // Update title if AI generated one and it looks different/better? 
        // For now, let's trust AI refined title as per user request "update other related fields"
        if (aiResult.title) {
            updates.push('title = ?');
            params.push(aiResult.title);
        }

        // Update URL if AI found one and it's missing or different
        if (aiResult.url && aiResult.url !== record.url) {
            updates.push('url = ?');
            params.push(aiResult.url);
            // Also update source if it's empty
            if (!record.source) {
                updates.push('source = ?');
                params.push(aiResult.url);
            }
        }

        // Update content if original was empty and we fetched something
        if (aiResult.content && (!content || aiResult.content.length > content.length)) {
             updates.push('content = ?');
             params.push(aiResult.content);
        }

        // Update timestamp
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());

        params.push(contentId); // For WHERE clause

        const sql = `UPDATE contents SET ${updates.join(', ')} WHERE id = ?`;
        await run(sql, params);

        // 4. Update Tags
        if (aiResult.tags && aiResult.tags.length > 0) {
            logger.info(`  -> Updating tags: ${aiResult.tags.join(', ')}`);
            // We need user_id to insert tags. Fetch it from record.
            const userId = record.user_id;
            
            if (userId) {
                // Remove existing tags for this content? Or append?
                // "Optimize" usually implies replacing with better ones. Let's replace.
                // But to be safe, maybe we should just add new ones? 
                // Let's clear and re-add to match "sync" logic which usually syncs state.
                
                await run('DELETE FROM content_tags WHERE content_id = ?', [contentId]);

                for (const tagName of aiResult.tags) {
                    // Find or create tag
                    let tag = await queryOne('SELECT id FROM tags WHERE name = ? AND user_id = ?', [tagName, userId]);
                    if (!tag) {
                        const res = await run('INSERT INTO tags (name, user_id) VALUES (?, ?)', [tagName, userId]);
                        tag = { id: res.lastID };
                    }
                    // Link tag
                    await run('INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)', [contentId, tag.id]);
                }
            }
        }

        logger.info(`  -> Success. Updated fields: ${updates.length} items.`);
        successCount++;

      } catch (err) {
        logger.error(`  -> Error processing ID ${contentId}:`, err);
        failedCount++;
      }
    }

    logger.info('------------------------------------------------');
    logger.info(`Batch Optimization Completed.`);
    logger.info(`Total: ${contents.length}`);
    logger.info(`Success: ${successCount}`);
    logger.info(`Failed: ${failedCount}`);
    logger.info(`Skipped: ${skippedCount}`);

  } catch (error) {
    logger.error('Fatal Error:', error);
  }
}

batchOptimize();
