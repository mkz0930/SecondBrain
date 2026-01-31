/**
 * 检查飞书表格中23号数据的状态
 */
import dotenv from 'dotenv';
dotenv.config();

import { query, queryOne } from '../server/models/database.js';
import { SyncService } from '../server/services/sync-service.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function checkFeishu23() {
  const userId = 2;

  // 获取飞书配置
  const config = await queryOne(
    'SELECT * FROM feishu_sync_config WHERE user_id = ?',
    [userId]
  );

  if (!config) {
    console.log('没有找到飞书配置');
    return;
  }

  const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);
  const [appToken, tableId] = config.table_id.split('_');

  const adapter = new FeishuAdapter({
    app_id: config.app_id,
    app_secret: appSecret,
    access_token: config.access_token,
    token_expires_at: config.token_expires_at,
    logger
  });

  // 刷新token
  await adapter.refreshAccessToken();

  // 获取飞书表格字段
  console.log('\n=== 飞书表格字段 ===');
  const fields = await adapter.getFields(appToken, tableId);
  fields.forEach(f => {
    console.log(`字段: ${f.field_name} (类型: ${f.type})`);
  });

  // 获取23号数据的映射
  const mappings = await query(
    'SELECT content_id, feishu_record_id FROM feishu_sync_mapping WHERE content_id BETWEEN 640 AND 648'
  );

  console.log('\n=== 检查23号数据在飞书中的状态 ===');

  for (const mapping of mappings) {
    try {
      const record = await adapter.getRecord(appToken, tableId, mapping.feishu_record_id);
      const fields = record.fields;

      console.log(`\nID ${mapping.content_id} (飞书: ${mapping.feishu_record_id}):`);
      console.log(`  标题: ${fields['标题'] || '无'}`);
      console.log(`  日期: ${JSON.stringify(fields['日期'] || '无')}`);
      console.log(`  分类: ${JSON.stringify(fields['分类'] || '无')}`);
    } catch (err) {
      console.log(`\nID ${mapping.content_id}: 获取失败 - ${err.message}`);
    }
  }
}

checkFeishu23().catch(console.error);
