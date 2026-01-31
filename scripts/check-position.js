import { query } from '../server/models/database.js';

async function check() {
  // 查看23号数据的updated_at
  const sql = `
    SELECT id, title, updated_at
    FROM contents
    WHERE user_id = 2 AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;

  const contents = await query(sql);

  // 找到23号数据的位置
  const jan23Ids = [640, 641, 642, 643, 644, 645, 646, 647, 648];

  console.log('23号数据在排序中的位置:');
  contents.forEach((c, i) => {
    if (jan23Ids.includes(c.id)) {
      console.log(`位置 ${i+1}: ID:${c.id} | updated:${c.updated_at} | ${c.title.substring(0,30)}`);
    }
  });

  console.log('\n总数:', contents.length);
  console.log('23号数据需要翻到第几页 (每页20条):');
  jan23Ids.forEach(id => {
    const pos = contents.findIndex(c => c.id === id) + 1;
    const page = Math.ceil(pos / 20);
    console.log(`  ID ${id}: 位置 ${pos}, 第 ${page} 页`);
  });
}

check();
