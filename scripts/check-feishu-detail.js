/**
 * 详细检查飞书23号数据的所有字段
 */
import dotenv from 'dotenv';
dotenv.config();

import { query, queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function checkFeishuDetail() {
  const userId = 2;

  const config = await queryOne(
    'SELECT * FROM feishu_sync_config WHERE user_id = ?',
    [userId]
  );

  const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);
  const [appToken, tableId] = config.table_id.split('_');

  const adapter = new FeishuAdapter({
    app_id: config.app_id,
    app_secret: appSecret,
    access_token: config.access_token,
    token_expires_at: config.token_expires_at,
    logger
  });

  await adapter.refreshAccessToken();

  // 获取23号数据的映射
  const mappings = await query(
    'SELECT content_id, feishu_record_id FROM feishu_sync_mapping WHERE content_id BETWEEN 640 AND 648'
  );

  // 获取本地数据
  const localContents = await query(
    'SELECT id, title, summary, type, content, url FROM contents WHERE id BETWEEN 640 AND 648'
  );
  const localMap = new Map(localContents.map(c => [c.id, c]));

  console.log('\n=== 对比本地与飞书数据 ===\n');

  for (const mapping of mappings) {
    try {
      const record = await adapter.getRecord(appToken, tableId, mapping.feishu_record_id);
      const fields = record.fields;
      const local = localMap.get(mapping.content_id);

      console.log(`\n--- ID ${mapping.content_id} ---`);
      console.log('本地标题:', local?.title?.substring(0, 50));
      console.log('飞书标题:', fields['标题']?.substring(0, 50));
      console.log('');
      console.log('本地摘要:', local?.summary?.substring(0, 50) || '(空)');
      console.log('飞书摘要:', fields['摘要']?.substring(0, 50) || '(空)');
      console.log('');
      console.log('本地类型:', local?.type);
      console.log('飞书分类:', JSON.stringify(fields['分类']));
      console.log('');
      console.log('本地正文长度:', local?.content?.length || 0);
      console.log('飞书正文长度:', fields['正文']?.length || fields['记录']?.length || 0);
      console.log('');
      console.log('本地URL:', local?.url?.substring(0, 50) || '(空)');
      console.log('飞书URL:', JSON.stringify(fields['url']) || '(空)');

    } catch (err) {
      console.log(`\nID ${mapping.content_id}: 获取失败 - ${err.message}`);
    }
  }
}

checkFeishuDetail().catch(console.error);
