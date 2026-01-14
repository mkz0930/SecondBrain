import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dbPath = join(__dirname, '../data/brain.db')

const db = new sqlite3.Database(dbPath)

console.log('📝 测试本地更新同步到飞书\n')

db.serialize(() => {
  // 1. 查看当前第一条内容
  db.get('SELECT * FROM contents WHERE user_id = 2 ORDER BY id LIMIT 1', (err, content) => {
    if (err || !content) {
      console.error('查询失败:', err)
      db.close()
      return
    }

    console.log('当前内容:')
    console.log(`  ID: ${content.id}`)
    console.log(`  标题: ${content.title}`)
    console.log(`  类型: ${content.type}`)
    console.log(`  评分: ${content.rating}`)
    console.log(`  收藏: ${content.is_favorite}`)
    console.log(`  更新时间: ${content.updated_at}\n`)

    // 2. 修改内容
    const newTitle = `${content.title} (已更新)`
    const newRating = content.rating === 5 ? 4 : 5
    const newFavorite = content.is_favorite ? 0 : 1
    const newUpdatedAt = new Date().toISOString()

    console.log('准备更新为:')
    console.log(`  标题: ${newTitle}`)
    console.log(`  评分: ${newRating}`)
    console.log(`  收藏: ${newFavorite}`)
    console.log(`  更新时间: ${newUpdatedAt}\n`)

    db.run(
      'UPDATE contents SET title = ?, rating = ?, is_favorite = ?, updated_at = ? WHERE id = ?',
      [newTitle, newRating, newFavorite, newUpdatedAt, content.id],
      function(err) {
        if (err) {
          console.error('更新失败:', err)
          db.close()
          return
        }

        console.log(`✓ 本地内容已更新 (ID: ${content.id})`)
        console.log('\n现在可以触发同步测试更新功能！')
        console.log('运行命令: curl -X POST http://localhost:3000/api/feishu/sync -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\\"direction\\":\\"both\\"}"')
        
        db.close()
      }
    )
  })
})
