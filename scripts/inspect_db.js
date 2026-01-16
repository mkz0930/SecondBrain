import { initDatabase, query } from '../server/models/database.js';

async function inspect() {
  await initDatabase();
  const rows = await query('SELECT id, title, user_id, deleted_at FROM contents');
  console.log('Contents:', JSON.stringify(rows, null, 2));
}

inspect().catch(console.error);
