/**
 * AI批量更新飞书内容脚本
 *
 * 功能：
 * 1. 获取所有本地内容
 * 2. 用AI分析补充缺失字段（title, summary, type, tags, content）
 * 3. 更新本地数据库
 * 4. 推送到飞书
 *
 * 用法：
 *   node scripts/ai-update-feishu.js [--force] [--limit N] [--user-id N]
 *
 * 参数：
 *   --force    强制更新所有内容（包括已有完整字段的）
 *   --limit N  限制处理数量
 *   --user-id  指定用户ID（默认为1）
 */

import dotenv from 'dotenv';
dotenv.config();

import { query, run, queryOne } from '../server/models/database.js';
import { analyzeContent } from '../server/services/ai-service.js';
import { SyncService } from '../server/services/sync-service.js';
import { decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    force: false,
    limit: null,
    userId: 1
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
      options.force = true;
    } else if (args[i] === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--user-id' && args[i + 1]) {
      options.userId = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

// 检查内容是否需要AI分析
function needsAIAnalysis(record, force) {
  if (force) return true;

  // 检查关键字段是否缺失或为空
  const missingTitle = !record.title || record.title === '无标题' || record.title.trim() === '';
  const missingSummary = !record.summary || record.summary.trim() === '';
  const missingType = !record.type || record.type === '其他';

  return missingTitle || missingSummary || missingType;
}

async function aiUpdateFeishu() {
  const options = parseArgs();

  logger.info('='.repeat(60));
  logger.info('AI批量更新飞书内容');
  logger.info('='.repeat(60));
  logger.info(`参数: force=${options.force}, limit=${options.limit || '无限制'}, userId=${options.userId}`);

  // 检查API Key
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    logger.error('错误: 缺少 GOOGLE_API_KEY 或 GEMINI_API_KEY 环境变量');
    process.exit(1);
  }

  try {
    // 1. 获取飞书配置
    const feishuConfig = await queryOne(
      `SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1`,
      [options.userId]
    );

    if (!feishuConfig) {
      logger.error(`错误: 用户 ${options.userId} 没有启用的飞书配置`);
      process.exit(1);
    }

    logger.info(`飞书配置: app_id=${feishuConfig.app_id}, table_id=${feishuConfig.table_id}`);

    // 2. 获取所有未删除的内容
    let sql = 'SELECT * FROM contents WHERE deleted_at IS NULL AND user_id = ?';
    const params = [options.userId];

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const contents = await query(sql, params);
    logger.info(`找到 ${contents.length} 条内容`);

    // 3. 筛选需要AI分析的内容
    const toProcess = contents.filter(c => needsAIAnalysis(c, options.force));
    logger.info(`需要AI分析的内容: ${toProcess.length} 条`);

    if (toProcess.length === 0) {
      logger.info('没有需要处理的内容');

      // 仍然执行同步，确保已有数据同步到飞书
      logger.info('执行飞书同步...');
      await syncToFeishu(feishuConfig, options.userId);
      return;
    }

    // 4. 批量AI分析并更新
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const record = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      logger.info(`${progress} 处理 ID:${record.id} "${record.title || '无标题'}"...`);

      // 检查是否有可分析的内容
      const hasContent = record.content && record.content.trim().length > 0;
      const hasUrl = record.url && record.url.startsWith('http');
      const hasSource = record.source && record.source.startsWith('http');

      if (!hasContent && !hasUrl && !hasSource) {
        logger.info(`  -> 跳过: 无内容且无有效URL`);
        skippedCount++;
        continue;
      }

      try {
        // 添加延迟避免速率限制
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 调用AI分析
        const input = record.content || '';
        const sourceUrl = record.url || record.source;

        let aiResult = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            aiResult = await analyzeContent(input, sourceUrl);
            break;
          } catch (error) {
            if (error.status === 429) {
              const waitTime = 30000 * (retries + 1);
              logger.warn(`  -> 速率限制，等待 ${waitTime/1000} 秒后重试 (${retries + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retries++;
            } else {
              throw error;
            }
          }
        }

        if (!aiResult || aiResult.summary === null) {
          logger.warn(`  -> AI分析失败`);
          failedCount++;
          continue;
        }

        // 5. 更新数据库
        const updates = [];
        const updateParams = [];

        // 更新标题
        if (aiResult.title && aiResult.title !== '无标题') {
          updates.push('title = ?');
          updateParams.push(aiResult.title);
        }

        // 更新摘要
        if (aiResult.summary) {
          updates.push('summary = ?');
          updateParams.push(aiResult.summary);
        }

        // 更新类型
        if (aiResult.type) {
          updates.push('type = ?');
          updateParams.push(aiResult.type);
        }

        // 更新URL
        if (aiResult.url && !record.url) {
          updates.push('url = ?');
          updateParams.push(aiResult.url);
        }

        // 更新内容（如果AI生成的更丰富）
        if (aiResult.content && (!record.content || aiResult.content.length > record.content.length * 1.2)) {
          updates.push('content = ?');
          updateParams.push(aiResult.content);
        }

        // 更新时间戳
        updates.push('updated_at = ?');
        updateParams.push(new Date().toISOString());

        updateParams.push(record.id);

        if (updates.length > 1) {
          const updateSql = `UPDATE contents SET ${updates.join(', ')} WHERE id = ?`;
          await run(updateSql, updateParams);
        }

        // 6. 更新标签
        if (aiResult.tags && aiResult.tags.length > 0) {
          await updateTags(record.id, record.user_id, aiResult.tags);
        }

        logger.info(`  -> 成功: title="${aiResult.title}", type="${aiResult.type}", tags=[${(aiResult.tags || []).join(', ')}]`);
        successCount++;

      } catch (err) {
        logger.error(`  -> 错误: ${err.message}`);
        failedCount++;
      }
    }

    // 7. 输出AI分析统计
    logger.info('-'.repeat(60));
    logger.info('AI分析完成:');
    logger.info(`  成功: ${successCount}`);
    logger.info(`  失败: ${failedCount}`);
    logger.info(`  跳过: ${skippedCount}`);

    // 8. 同步到飞书
    if (successCount > 0) {
      logger.info('-'.repeat(60));
      logger.info('开始同步到飞书...');
      await syncToFeishu(feishuConfig, options.userId);
    }

    logger.info('='.repeat(60));
    logger.info('全部完成!');

  } catch (error) {
    logger.error('致命错误:', error);
    process.exit(1);
  }
}

// 更新标签
async function updateTags(contentId, userId, tags) {
  // 清除现有标签
  await run('DELETE FROM content_tags WHERE content_id = ?', [contentId]);

  for (const tagName of tags) {
    // 查找或创建标签
    let tag = await queryOne('SELECT id FROM tags WHERE name = ? AND user_id = ?', [tagName, userId]);
    if (!tag) {
      const res = await run('INSERT INTO tags (name, user_id) VALUES (?, ?)', [tagName, userId]);
      tag = { id: res.lastID };
    }
    // 关联标签
    await run('INSERT OR IGNORE INTO content_tags (content_id, tag_id) VALUES (?, ?)', [contentId, tag.id]);
  }
}

// 同步到飞书
async function syncToFeishu(config, userId) {
  try {
    // 解密app_secret
    const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);

    const syncService = new SyncService({
      user_id: userId,
      app_id: config.app_id,
      app_secret: appSecret,
      table_id: config.table_id,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at
    }, logger);

    // 执行推送同步（强制更新所有已同步的记录）
    const result = await syncService.performSync('manual', 'push', { forceUpdate: true });

    logger.info('飞书同步结果:');
    logger.info(`  总数: ${result.total}`);
    logger.info(`  成功: ${result.success}`);
    logger.info(`  失败: ${result.failed}`);

    return result;
  } catch (error) {
    logger.error('飞书同步失败:', error.message);
    throw error;
  }
}

// 运行
aiUpdateFeishu();
