/**
 * 验证特定记录的分类
 */

import { queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function verifySpecificRecord() {
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

  // 获取标题包含"3.56 复制打开抖音"的记录
  const content = await queryOne(`
    SELECT c.id, c.title, c.type, m.feishu_record_id
    FROM contents c
    JOIN feishu_sync_mapping m ON c.id = m.content_id
    WHERE c.title LIKE '%3.56 复制打开抖音%' AND c.deleted_at IS NULL
    LIMIT 1
  `);

  if (!content) {
    console.log('未找到该记录');
    return;
  }

  console.log('本地记录:');
  console.log('  ID:', content.id);
  console.log('  标题:', content.title?.substring(0, 50));
  console.log('  本地类型:', content.type);
  console.log('  飞书记录ID:', content.feishu_record_id);

  const record = await adapter.getRecord(appToken, tableId, content.feishu_record_id);

  console.log('\n飞书记录:');
  console.log('  分类字段值:', JSON.stringify(record.fields['分类']));
  console.log('  标题:', record.fields['标题']?.substring(0, 50));

  // 再次强制更新这条记录
  console.log('\n再次强制更新分类为"抖音"...');
  await adapter.updateRecord(appToken, tableId, content.feishu_record_id, {
    '分类': ['抖音']
  });

  // 验证更新
  const updatedRecord = await adapter.getRecord(appToken, tableId, content.feishu_record_id);
  console.log('更新后分类:', JSON.stringify(updatedRecord.fields['分类']));
}

verifySpecificRecord().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
