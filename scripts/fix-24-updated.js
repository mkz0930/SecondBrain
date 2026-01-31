import { run } from '../server/models/database.js';

async function fix() {
  const now = new Date().toISOString();
  await run('UPDATE contents SET updated_at = ? WHERE id IN (649, 650)', [now]);
  console.log('已更新24号数据(ID 649, 650)的updated_at为:', now);
}

fix();
