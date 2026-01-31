/**
 * 更新飞书表格的"分类"字段，添加新的选项
 */

import { queryOne } from '../server/models/database.js';
import { FeishuAdapter, decryptSecret } from '../server/services/feishu-adapter.js';
import logger from '../server/utils/logger.js';

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me';

// 需要添加的新选项
const NEW_OPTIONS = ['抖音', '公众号', 'B站', '文档', '随便', '其他'];

async function updateFeishuFieldOptions() {
  console.log('开始更新飞书分类字段选项...\n');

  // 获取飞书配置
  const config = await queryOne(
    'SELECT * FROM feishu_sync_config WHERE user_id = ?',
    [2] // 假设用户ID为2，根据实际情况调整
  );

  if (!config) {
    console.error('未找到飞书配置');
    process.exit(1);
  }

  // 解密 app_secret
  const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY);

  // 创建适配器
  const adapter = new FeishuAdapter({
    app_id: config.app_id,
    app_secret: appSecret,
    access_token: config.access_token,
    token_expires_at: config.token_expires_at,
    logger: logger
  });

  // 刷新 token
  await adapter.refreshAccessToken();

  // 解析 table_id
  const [appToken, tableId] = config.table_id.split('_');
  console.log(`App Token: ${appToken}`);
  console.log(`Table ID: ${tableId}\n`);

  // 获取字段列表
  const fields = await adapter.getFields(appToken, tableId);
  console.log('当前字段列表:');
  fields.forEach(f => {
    console.log(`  - ${f.field_name} (type: ${f.type}, id: ${f.field_id})`);
    if (f.property && f.property.options) {
      console.log(`    选项: ${f.property.options.map(o => o.name).join(', ')}`);
    }
  });

  // 找到"分类"字段
  const categoryField = fields.find(f =>
    f.field_name === '分类' || f.field_name === '内容类型'
  );

  if (!categoryField) {
    console.error('\n未找到"分类"或"内容类型"字段');
    process.exit(1);
  }

  console.log(`\n找到分类字段: ${categoryField.field_name}`);
  console.log(`字段ID: ${categoryField.field_id}`);
  console.log(`字段类型: ${categoryField.type}`);

  // 检查是否是单选字段 (type 3)
  if (categoryField.type !== 3) {
    console.error(`分类字段不是单选类型 (当前类型: ${categoryField.type})`);
    process.exit(1);
  }

  // 获取现有选项
  const existingOptions = categoryField.property?.options || [];
  console.log(`\n现有选项: ${existingOptions.map(o => o.name).join(', ')}`);

  // 找出需要添加的新选项
  const existingNames = new Set(existingOptions.map(o => o.name));
  const optionsToAdd = NEW_OPTIONS.filter(name => !existingNames.has(name));

  if (optionsToAdd.length === 0) {
    console.log('\n所有选项已存在，无需更新');
    return;
  }

  console.log(`\n需要添加的选项: ${optionsToAdd.join(', ')}`);

  // 构建新的选项列表
  const newOptions = [
    ...existingOptions,
    ...optionsToAdd.map(name => ({ name }))
  ];

  // 更新字段
  console.log('\n正在更新字段选项...');

  try {
    const response = await adapter.request(
      'PUT',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields/${categoryField.field_id}`,
      {
        field_name: categoryField.field_name,
        type: 3, // 单选类型
        property: {
          options: newOptions
        }
      }
    );

    console.log('\n字段更新成功！');
    console.log('新的选项列表:', response.data?.field?.property?.options?.map(o => o.name).join(', '));
  } catch (error) {
    console.error('\n更新字段失败:', error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n完成！请重新运行强制同步将分类推送到飞书。');
}

updateFeishuFieldOptions().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
