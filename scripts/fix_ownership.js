import { initDatabase, run, queryOne } from '../server/models/database.js';

async function fix() {
  await initDatabase();
  
  const admin = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!admin) {
    console.error('Admin user not found!');
    return;
  }
  
  const targetUserId = admin.id;
  console.log(`Reassigning all contents and tags to user ${targetUserId} (admin)...`);
  
  await run('UPDATE contents SET user_id = ?', [targetUserId]);
  await run('UPDATE tags SET user_id = ?', [targetUserId]);
  
  console.log('Ownership fixed. Please refresh the page.');
}

fix().catch(console.error);
