/**
 * 测试直接更新飞书记录的分类字段
 */

import { query, queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

async function testUpdateCategory() {
  console.log('=== 测试更新飞书分类字段 ===\n');

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
    logger: logger
  });

  await adapter.refreshAccessToken();

  const [appToken, tableId] = config.table_id.split('_');

  // 获取字段列表
  const fields = await adapter.getFields(appToken, tableId);
  console.log('字段列表:');
  fields.forEach(f => {
    console.log(`  ${f.field_name}: type=${f.type}, id=${f.field_id}`);
    if (f.property?.options) {
      console.log(`    选项: ${f.property.options.map(o => o.name).join(', ')}`);
    }
  });

  // 找到分类字段
  const categoryField = fields.find(f => f.field_name === '分类');
  if (!categoryField) {
    console.error('未找到分类字段');
    process.exit(1);
  }

  console.log(`\n分类字段信息:`);
  console.log(`  名称: ${categoryField.field_name}`);
  console.log(`  类型: ${categoryField.type} (4=多选)`);
  console.log(`  选项: ${categoryField.property?.options?.map(o => o.name).join(', ')}`);

  // 获取一条类型为"抖音"的本地内容
  const douyinContent = await queryOne(`
    SELECT c.*, m.feishu_record_id
    FROM contents c
    JOIN feishu_sync_mapping m ON c.id = m.content_id
    WHERE c.type = '抖音' AND c.deleted_at IS NULL
    LIMIT 1
  `);

  if (!douyinContent) {
    console.error('未找到类型为"抖音"的内容');
    process.exit(1);
  }

  console.log(`\n测试内容:`);
  console.log(`  ID: ${douyinContent.id}`);
  console.log(`  标题: ${douyinContent.title?.substring(0, 50)}`);
  console.log(`  本地类型: ${douyinContent.type}`);
  console.log(`  飞书记录ID: ${douyinContent.feishu_record_id}`);

  // 先获取当前飞书记录
  console.log(`\n获取当前飞书记录...`);
  const currentRecord = await adapter.getRecord(appToken, tableId, douyinContent.feishu_record_id);
  console.log(`  当前分类值: ${JSON.stringify(currentRecord.fields['分类'])}`);

  // 测试直接更新分类字段
  console.log(`\n测试更新分类为"抖音"...`);

  // 多选字段需要数组格式
  const updateFields = {
    '分类': ['抖音']  // 多选字段需要数组
  };

  console.log(`  发送的数据: ${JSON.stringify(updateFields)}`);

  try {
    const result = await adapter.updateRecord(appToken, tableId, douyinContent.feishu_record_id, updateFields);
    console.log(`\n更新成功！`);
    console.log(`  新的分类值: ${JSON.stringify(result.fields['分类'])}`);
  } catch (error) {
    console.error(`\n更新失败: ${error.message}`);
    if (error.response?.data) {
      console.error(`  错误详情: ${JSON.stringify(error.response.data)}`);
    }
  }

  // 再次获取记录确认
  console.log(`\n再次获取记录确认...`);
  const updatedRecord = await adapter.getRecord(appToken, tableId, douyinContent.feishu_record_id);
  console.log(`  更新后分类值: ${JSON.stringify(updatedRecord.fields['分类'])}`);
}

testUpdateCategory().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
