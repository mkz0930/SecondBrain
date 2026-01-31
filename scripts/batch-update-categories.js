/**
 * 批量更新飞书记录的分类字段
 * 根据本地数据库中的类型直接更新飞书
 */

import { query, queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function batchUpdateCategories() {
  console.log('=== 批量更新飞书分类字段 ===\n');

  // 获取飞书配置
  const config = await queryOne(
    'SELECT * FROM feishu_sync_config WHERE user_id = ?',
    [2]
  );

  if (!config) {
    console.error('未找到飞书配置');
    process.exit(1);
  }

  const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);
  const adapter = new FeishuAdapter({
    app_id: config.app_id,
    app_secret: appSecret,
    access_token: config.access_token,
    token_expires_at: config.token_expires_at,
    logger: { info: () => {}, warn: console.warn, error: console.error, debug: () => {} }
  });

  await adapter.refreshAccessToken();
  console.log('Token 刷新成功\n');

  const [appToken, tableId] = config.table_id.split('_');

  // 获取所有有映射的内容
  const contents = await query(`
    SELECT c.id, c.title, c.type, m.feishu_record_id
    FROM contents c
    JOIN feishu_sync_mapping m ON c.id = m.content_id
    WHERE c.deleted_at IS NULL
    ORDER BY c.id
  `);

  console.log(`共找到 ${contents.length} 条需要更新的内容\n`);

  // 统计类型分布
  const typeCount = {};
  contents.forEach(c => {
    typeCount[c.type] = (typeCount[c.type] || 0) + 1;
  });
  console.log('类型分布:', typeCount);
  console.log('');

  // 批量更新
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const category = content.type || '其他';

    // 跳过已经是旧类型的（note, article 等会被转换）
    // 我们需要更新所有记录

    try {
      // 多选字段需要数组格式
      const updateFields = {
        '分类': [category]
      };

      await adapter.updateRecord(appToken, tableId, content.feishu_record_id, updateFields);
      successCount++;

      if ((i + 1) % 10 === 0 || i === contents.length - 1) {
        console.log(`进度: ${i + 1}/${contents.length} (成功: ${successCount}, 失败: ${failCount})`);
      }

      // 避免触发限流
      if ((i + 1) % 50 === 0) {
        console.log('暂停 2 秒避免限流...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      failCount++;
      console.error(`更新失败 ID=${content.id}: ${error.message}`);
    }
  }

  console.log(`\n=== 更新完成 ===`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failCount}`);
}

batchUpdateCategories().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
