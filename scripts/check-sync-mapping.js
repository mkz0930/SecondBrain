/**
 * 检查同步映射表状态并强制触发分类更新
 */

import { query, run } from '../server/models/database.js';

async function checkAndFixMapping() {
  console.log('=== 检查同步映射表状态 ===\n');

  // 检查映射表中的记录数
  const mappingCount = await query('SELECT COUNT(*) as count FROM feishu_sync_mapping');
  console.log(`映射表中共有 ${mappingCount[0].count} 条记录\n`);

  // 检查一些示例映射
  const sampleMappings = await query(`
    SELECT m.*, c.title, c.type, c.updated_at as content_updated_at
    FROM feishu_sync_mapping m
    JOIN contents c ON m.content_id = c.id
    ORDER BY m.content_id DESC
    LIMIT 10
  `);

  console.log('示例映射记录:');
  sampleMappings.forEach(m => {
    console.log(`  ID: ${m.content_id} | 类型: ${m.type || '?'}`);
    console.log(`    标题: ${(m.title || '').substring(0, 40)}`);
    console.log(`    内容更新时间: ${m.content_updated_at}`);
    console.log(`    映射本地时间: ${m.local_updated_at}`);
    console.log(`    最后同步时间: ${m.last_sync_at}`);
    console.log('');
  });

  // 检查类型为"抖音"的内容是否在映射表中
  const douyinContents = await query(`
    SELECT c.id, c.title, c.type, c.updated_at, m.local_updated_at, m.feishu_record_id
    FROM contents c
    LEFT JOIN feishu_sync_mapping m ON c.id = m.content_id
    WHERE c.type = '抖音' AND c.deleted_at IS NULL
    LIMIT 5
  `);

  console.log('\n=== 类型为"抖音"的内容 ===');
  douyinContents.forEach(c => {
    const hasMapping = c.feishu_record_id ? '有映射' : '无映射';
    const needsUpdate = c.updated_at > c.local_updated_at ? '需要更新' : '已同步';
    console.log(`  ID: ${c.id} | ${hasMapping} | ${needsUpdate}`);
    console.log(`    标题: ${(c.title || '').substring(0, 40)}`);
    console.log(`    内容更新: ${c.updated_at}`);
    console.log(`    映射时间: ${c.local_updated_at || '无'}`);
    console.log('');
  });

  // 强制更新所有映射的 local_updated_at 为旧时间，触发重新同步
  console.log('\n=== 重置映射时间以触发强制同步 ===');

  const result = await run(`
    UPDATE feishu_sync_mapping
    SET local_updated_at = datetime('2020-01-01 00:00:00')
    WHERE content_id IN (SELECT id FROM contents WHERE deleted_at IS NULL)
  `);

  console.log(`已重置 ${result.changes} 条映射记录的时间戳`);
  console.log('\n请重新运行同步命令！');
}

checkAndFixMapping().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
