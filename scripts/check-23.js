import { query } from '../server/models/database.js';

async function check() {
  const contents = await query("SELECT id, title, created_at FROM contents WHERE created_at >= '2026-01-23' AND created_at < '2026-01-24' AND deleted_at IS NULL ORDER BY created_at");
  console.log('1月23号的内容:');
  contents.forEach(c => console.log('ID:', c.id, '| 创建时间:', c.created_at, '| 标题:', c.title.substring(0,50)));
  console.log('总数:', contents.length);
}

check();
