import { query } from '../server/models/database.js';

async function check() {
  // 查看24号数据
  const contents = await query("SELECT id, title, created_at, updated_at FROM contents WHERE created_at >= '2026-01-24' AND deleted_at IS NULL ORDER BY created_at");
  console.log('24号创建的数据:');
  contents.forEach(c => {
    console.log(`ID:${c.id} | created:${c.created_at} | ${c.title.substring(0,40)}`);
  });
  console.log('总数:', contents.length);
}

check();
