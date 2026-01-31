import dotenv from 'dotenv';
dotenv.config();

import { query, run } from '../server/models/database.js';
import { analyzeContent } from '../server/services/ai-service.js';
import logger from '../server/utils/logger.js';

/**
 * 使用 AI 修复无意义标题的笔记
 * 包括：URL开头、"未命名笔记"、过短标题等
 */
async function aiFixTitles() {
  logger.info('开始使用 AI 修复笔记标题...');

  try {
    // 查找需要修复的记录：
    // 1. 标题以 http 开头（URL）
    // 2. 标题为特定无意义值
    // 3. 标题过短（少于3个字符）
    const contents = await query(`
      SELECT id, title, content, url
      FROM contents
      WHERE deleted_at IS NULL
        AND (
          title LIKE 'http%'
          OR title = '未命名笔记'
          OR title = '[image]'
          OR title = '-'
          OR title LIKE '原创%'
          OR title LIKE '关注前沿%'
          OR title LIKE '#!/bin%'
          OR LENGTH(title) < 3
        )
      ORDER BY id
    `);

    logger.info(`找到 ${contents.length} 条需要修复的记录`);

    if (contents.length === 0) {
      logger.info('没有需要修复的记录');
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contents.length; i++) {
      const record = contents[i];
      const { id, title, content, url } = record;

      logger.info(`[${i + 1}/${contents.length}] 处理 ID: ${id}, 当前标题: "${title}"`);

      try {
        // 使用 AI 分析内容
        const result = await analyzeContent(content, url);

        if (result && result.title && result.title !== '无标题' && result.title !== '未命名笔记') {
          // 更新标题
          await run(
            'UPDATE contents SET title = ?, updated_at = ? WHERE id = ?',
            [result.title, new Date().toISOString(), id]
          );
          logger.info(`  -> 成功: "${result.title}"`);
          successCount++;
        } else {
          logger.warn(`  -> AI 未能生成有效标题，跳过`);
          failedCount++;
        }

        // 添加延迟避免 API 限流
        if (i < contents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error(`  -> 失败: ${error.message}`);
        failedCount++;

        // 如果是速率限制，等待更长时间
        if (error.status === 429) {
          logger.info('  -> 遇到速率限制，等待 30 秒...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }

    logger.info('------------------------------------------------');
    logger.info('修复完成!');
    logger.info(`总计: ${contents.length}`);
    logger.info(`成功: ${successCount}`);
    logger.info(`失败: ${failedCount}`);

  } catch (error) {
    logger.error('执行出错:', error);
  }
}

aiFixTitles();
