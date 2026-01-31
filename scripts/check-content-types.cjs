const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/brain.db');
const db = new Database(dbPath);

// 查看所有不同的 type 值及其数量
const typeStats = db.prepare(`
  SELECT type, COUNT(*) as count
  FROM contents
  WHERE deleted_at IS NULL
  GROUP BY type
  ORDER BY count DESC
`).all();

console.log('=== 本地数据库中的内容类型统计 ===');
console.log(typeStats);

// 查看最近的内容及其类型
const recentContents = db.prepare(`
  SELECT id, title, type, url, created_at
  FROM contents
  WHERE deleted_at IS NULL
  ORDER BY id DESC
  LIMIT 20
`).all();

console.log('\n=== 最近20条内容的类型 ===');
recentContents.forEach(c => {
  const shortTitle = (c.title || '').substring(0, 40);
  const shortUrl = (c.url || '').substring(0, 30);
  console.log(`ID: ${c.id} | 类型: ${c.type || '空'} | 标题: ${shortTitle}`);
  if (c.url) console.log(`   URL: ${shortUrl}...`);
});

// 检查标题包含"抖音"但类型不是"抖音"的内容
const mismatchedDouyin = db.prepare(`
  SELECT id, title, type, url
  FROM contents
  WHERE deleted_at IS NULL
    AND (title LIKE '%抖音%' OR title LIKE '%复制打开%')
    AND type != '抖音'
  LIMIT 10
`).all();

console.log('\n=== 标题含"抖音"但类型不是"抖音"的内容 ===');
if (mismatchedDouyin.length === 0) {
  console.log('没有找到不匹配的内容');
} else {
  mismatchedDouyin.forEach(c => {
    console.log(`ID: ${c.id} | 类型: ${c.type} | 标题: ${c.title?.substring(0, 50)}`);
  });
}

// 检查 URL 包含 mp.weixin.qq.com 但类型不是"公众号"的内容
const mismatchedWechat = db.prepare(`
  SELECT id, title, type, url
  FROM contents
  WHERE deleted_at IS NULL
    AND url LIKE '%mp.weixin.qq.com%'
    AND type != '公众号'
  LIMIT 10
`).all();

console.log('\n=== URL是微信公众号但类型不是"公众号"的内容 ===');
if (mismatchedWechat.length === 0) {
  console.log('没有找到不匹配的内容');
} else {
  mismatchedWechat.forEach(c => {
    console.log(`ID: ${c.id} | 类型: ${c.type} | 标题: ${c.title?.substring(0, 50)}`);
  });
}

db.close();
