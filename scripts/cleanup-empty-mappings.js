import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'brain.db');
const db = new (sqlite3.verbose().Database)(dbPath);

console.log('清理空记录的映射关系...');

db.serialize(() => {
  // 删除标题包含"空记录"的映射（字段名是content_id，不是local_content_id）
  db.run(`
    DELETE FROM feishu_sync_mapping
    WHERE content_id IN (
      SELECT id FROM contents
      WHERE title LIKE '%空记录%'
      OR content = ''
      OR content IS NULL
    )
  `, function(err) {
    if (err) {
      console.error('删除映射失败:', err);
    } else {
      console.log(`已删除 ${this.changes} 条空记录映射`);
    }
  });

  // 删除对应的本地内容
  db.run(`
    DELETE FROM contents
    WHERE title LIKE '%空记录%'
    OR (content = '' OR content IS NULL)
  `, function(err) {
    if (err) {
      console.error('删除内容失败:', err);
    } else {
      console.log(`已删除 ${this.changes} 条空记录内容`);
    }

    db.close(() => {
      console.log('清理完成！');
    });
  });
});
