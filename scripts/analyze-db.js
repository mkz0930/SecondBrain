import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'brain.db');
const db = new (sqlite3.verbose().Database)(dbPath);

console.log('📊 数据库详细分析\n');

db.serialize(() => {
  // 1. 查看最近10条记录的详细信息
  db.all(`
    SELECT
      c.id,
      c.title,
      c.type,
      LENGTH(c.content) as content_len,
      LENGTH(c.summary) as summary_len,
      c.created_at,
      SUBSTR(c.content, 1, 100) as content_preview
    FROM contents c
    ORDER BY c.id DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('查询失败:', err);
      return;
    }

    console.log('📝 最近10条记录详情:\n');
    rows.forEach(r => {
      console.log(`ID ${r.id}: ${r.title}`);
      console.log(`  类型: ${r.type || '未知'}`);
      console.log(`  内容长度: ${r.content_len || 0} 字符`);
      console.log(`  摘要长度: ${r.summary_len || 0} 字符`);
      console.log(`  创建时间: ${r.created_at}`);
      if (r.content_preview) {
        console.log(`  内容预览: ${r.content_preview.replace(/\n/g, ' ')}...`);
      }
      console.log('');
    });
  });

  // 2. 查看飞书同步映射关系
  db.all(`
    SELECT
      m.id,
      m.content_id,
      m.feishu_record_id,
      c.title,
      m.last_sync_at,
      m.sync_direction
    FROM feishu_sync_mapping m
    LEFT JOIN contents c ON m.content_id = c.id
    ORDER BY m.id DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('查询映射失败:', err);
      return;
    }

    console.log('\n🔗 飞书同步映射关系（最近10条）:\n');
    rows.forEach(r => {
      console.log(`映射ID ${r.id}:`);
      console.log(`  本地内容ID: ${r.content_id} - ${r.title || '未知标题'}`);
      console.log(`  飞书记录ID: ${r.feishu_record_id}`);
      console.log(`  最后同步: ${r.last_sync_at || '未同步'}`);
      console.log(`  同步方向: ${r.sync_direction || '未知'}`);
      console.log('');
    });
  });

  // 3. 统计信息
  db.get(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN content IS NOT NULL AND LENGTH(TRIM(content)) > 0 THEN 1 ELSE 0 END) as with_content,
      SUM(CASE WHEN summary IS NOT NULL AND LENGTH(TRIM(summary)) > 0 THEN 1 ELSE 0 END) as with_summary,
      SUM(CASE WHEN content IS NULL OR LENGTH(TRIM(content)) = 0 THEN 1 ELSE 0 END) as empty_content
    FROM contents
  `, (err, row) => {
    if (err) {
      console.error('统计失败:', err);
      return;
    }

    console.log('\n📈 内容统计:\n');
    console.log(`  总记录数: ${row.total}`);
    console.log(`  有内容: ${row.with_content} 条`);
    console.log(`  有摘要: ${row.with_summary} 条`);
    console.log(`  空内容: ${row.empty_content} 条`);

    db.close(() => {
      console.log('\n✅ 分析完成！');
    });
  });
});
