/**
 * 验证飞书记录的分类是否已更新
 */

import { query, queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function verifyCategories() {
  console.log('=== 验证飞书分类更新结果 ===\n');

  const config = await queryOne('SELECT * FROM feishu_sync_config WHERE user_id = ?', [2]);
  const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);

  const adapter = new FeishuAdapter({
    app_id: config.app_id,
    app_secret: appSecret,
    access_token: config.access_token,
    token_expires_at: config.token_expires_at,
    logger: { info: () => {}, warn: console.warn, error: console.error, debug: () => {} }
  });

  await adapter.refreshAccessToken();

  const [appToken, tableId] = config.table_id.split('_');

  // 获取几条抖音类型的记录进行验证
  const douyinContents = await query(`
    SELECT c.id, c.title, c.type, m.feishu_record_id
    FROM contents c
    JOIN feishu_sync_mapping m ON c.id = m.content_id
    WHERE c.type = '抖音' AND c.deleted_at IS NULL
    LIMIT 5
  `);

  console.log('验证抖音类型的记录:\n');

  for (const content of douyinContents) {
    const record = await adapter.getRecord(appToken, tableId, content.feishu_record_id);
    const feishuCategory = record.fields['分类'];

    console.log(`ID: ${content.id}`);
    console.log(`  标题: ${content.title?.substring(0, 40)}`);
    console.log(`  本地类型: ${content.type}`);
    console.log(`  飞书分类: ${JSON.stringify(feishuCategory)}`);
    console.log(`  匹配: ${JSON.stringify(feishuCategory) === '["抖音"]' ? '✓' : '✗'}`);
    console.log('');
  }

  // 统计飞书中各分类的数量
  console.log('获取飞书所有记录统计分类...\n');

  const allRecords = [];
  let pageToken = null;

  do {
    const response = await adapter.searchRecords(appToken, tableId, { pageSize: 100, pageToken });
    allRecords.push(...response.items);
    pageToken = response.has_more ? response.page_token : null;
  } while (pageToken);

  const categoryStats = {};
  allRecords.forEach(record => {
    const category = record.fields['分类'];
    const categoryStr = Array.isArray(category) ? category.join(',') : (category || '空');
    categoryStats[categoryStr] = (categoryStats[categoryStr] || 0) + 1;
  });

  console.log('飞书分类统计:');
  Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} 条`);
  });
}

verifyCategories().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
