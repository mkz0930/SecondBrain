const Database = require('better-sqlite3');
const db = new Database('./data/brain.db');

const rows = db.prepare(`
  SELECT id, title, type, url
  FROM contents
  WHERE deleted_at IS NULL
  ORDER BY id DESC
  LIMIT 30
`).all();

console.log('本地数据库内容分类:');
console.log('ID | 类型 | 标题');
console.log('-'.repeat(80));
rows.forEach(r => {
  const title = (r.title || '').substring(0, 45);
  console.log(`${r.id} | ${r.type || '空'} | ${title}`);
});

db.close();
