import { run } from '../server/models/database.js';

async function fix() {
  const now = new Date().toISOString();
  await run('UPDATE contents SET updated_at = ? WHERE id BETWEEN 640 AND 648', [now]);
  console.log('已更新23号数据(ID 640-648)的updated_at为:', now);
}

fix();
