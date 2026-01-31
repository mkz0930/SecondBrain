import { query } from '../server/models/database.js';

async function check() {
  const contents = await query("SELECT id, title, created_at, updated_at FROM contents WHERE id BETWEEN 640 AND 650 ORDER BY updated_at DESC");
  console.log('23-24号数据的更新时间:');
  contents.forEach(c => {
    console.log(`ID:${c.id} | created:${c.created_at} | updated:${c.updated_at} | ${c.title.substring(0,30)}`);
  });
}

check();
