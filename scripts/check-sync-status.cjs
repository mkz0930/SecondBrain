const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/brain.db');

db.serialize(() => {
  // 检查映射表记录数
  db.get('SELECT COUNT(*) as count FROM feishu_sync_mapping', (err, row) => {
    console.log('映射表记录数:', row.count);
  });

  // 检查内容表记录数
  db.get('SELECT COUNT(*) as count FROM contents WHERE deleted_at IS NULL', (err, row) => {
    console.log('内容表记录数:', row.count);
  });

  // 检查孤立映射（映射存在但内容不存在）
  db.all(`
    SELECT m.feishu_record_id, m.content_id
    FROM feishu_sync_mapping m
    LEFT JOIN contents c ON m.content_id = c.id
    WHERE c.id IS NULL
    LIMIT 10
  `, (err, rows) => {
    console.log('孤立映射数量:', rows.length);
    if (rows.length > 0) {
      console.log('孤立映射示例:', rows);
    }
  });

  // 检查有内容但映射指向的内容已删除的情况
  db.all(`
    SELECT m.feishu_record_id, m.content_id, c.deleted_at
    FROM feishu_sync_mapping m
    JOIN contents c ON m.content_id = c.id
    WHERE c.deleted_at IS NOT NULL
    LIMIT 10
  `, (err, rows) => {
    console.log('映射指向已删除内容数量:', rows.length);
  });

  // 检查最近的内容
  db.all(`
    SELECT id, title, created_at, updated_at
    FROM contents
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  `, (err, rows) => {
    console.log('最近的内容:', rows);
  });

  // 检查内容的日期分布
  db.all(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM contents
    WHERE deleted_at IS NULL
    GROUP BY date(created_at)
    ORDER BY date DESC
    LIMIT 10
  `, (err, rows) => {
    console.log('内容日期分布:', rows);
  });
});

db.close();
