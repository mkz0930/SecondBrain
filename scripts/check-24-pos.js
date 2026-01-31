import { query } from '../server/models/database.js';

async function check() {
  const sql = 'SELECT id, updated_at FROM contents WHERE user_id = 2 AND deleted_at IS NULL ORDER BY updated_at DESC';
  const contents = await query(sql);

  const ids = [649, 650];
  console.log('24号数据位置:');
  ids.forEach(id => {
    const pos = contents.findIndex(c => c.id === id) + 1;
    const item = contents.find(c => c.id === id);
    console.log('ID', id, '| 位置:', pos, '| updated_at:', item?.updated_at);
  });
}

check();
