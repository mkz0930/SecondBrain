import { query } from '../server/models/database.js';

async function check() {
  // 模拟后端查询
  const sql = `
    SELECT id, title, created_at, updated_at
    FROM contents
    WHERE user_id = 2 AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `;

  const contents = await query(sql);
  console.log('数据库直接查询 (按updated_at DESC):');
  contents.forEach((c, i) => {
    console.log(`${i+1}. ID:${c.id} | updated:${c.updated_at} | ${c.title.substring(0,35)}`);
  });
}

check();
