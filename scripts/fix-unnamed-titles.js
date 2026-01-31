
import dotenv from 'dotenv';
dotenv.config();

import { query, run } from '../server/models/database.js';
import logger from '../server/utils/logger.js';

/**
 * 修复"未命名笔记"标题
 * 从内容中提取【】中的文字作为新标题
 */
async function fixUnnamedTitles() {
  logger.info('开始修复未命名笔记标题...');

  try {
    // 1. 查找所有标题为"未命名笔记"的记录
    const contents = await query(
      "SELECT id, title, content FROM contents WHERE title = '未命名笔记' AND deleted_at IS NULL"
    );

    logger.info(`找到 ${contents.length} 条"未命名笔记"记录需要处理`);

    if (contents.length === 0) {
      logger.info('没有需要修复的记录');
      return;
    }

    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < contents.length; i++) {
      const record = contents[i];
      const contentId = record.id;
      const content = record.content || '';

      logger.info(`[${i + 1}/${contents.length}] 处理 ID: ${contentId}...`);

      // 2. 从内容中提取【】中的文字
      const bracketMatch = content.match(/【([^】]+)】/);

      if (bracketMatch && bracketMatch[1]) {
        let newTitle = bracketMatch[1].trim();

        // 限制标题长度，最多50个字符
        if (newTitle.length > 50) {
          newTitle = newTitle.substring(0, 47) + '...';
        }

        // 3. 更新数据库
        await run(
          'UPDATE contents SET title = ?, updated_at = ? WHERE id = ?',
          [newTitle, new Date().toISOString(), contentId]
        );

        logger.info(`  -> 成功: "${newTitle}"`);
        successCount++;
      } else {
        // 尝试其他提取方式：取内容前30个字符
        const trimmedContent = content.trim();
        if (trimmedContent.length > 0) {
          let newTitle = trimmedContent.substring(0, 30);
          // 如果截断了，添加省略号
          if (trimmedContent.length > 30) {
            newTitle += '...';
          }
          // 移除换行符
          newTitle = newTitle.replace(/[\r\n]+/g, ' ');

          await run(
            'UPDATE contents SET title = ?, updated_at = ? WHERE id = ?',
            [newTitle, new Date().toISOString(), contentId]
          );

          logger.info(`  -> 使用内容前缀: "${newTitle}"`);
          successCount++;
        } else {
          logger.info(`  -> 跳过: 内容为空，无法提取标题`);
          skippedCount++;
        }
      }
    }

    logger.info('------------------------------------------------');
    logger.info('修复完成!');
    logger.info(`总计: ${contents.length}`);
    logger.info(`成功: ${successCount}`);
    logger.info(`跳过: ${skippedCount}`);
    logger.info('');
    logger.info('提示: 运行以下命令同步到飞书:');
    logger.info('curl -X POST http://localhost:3000/api/feishu/sync -H "Content-Type: application/json" -d \'{"direction": "push"}\'');

  } catch (error) {
    logger.error('执行出错:', error);
  }
}

fixUnnamedTitles();
