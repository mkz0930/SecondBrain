import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdir } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../data/brain.db')

// 创建数据库连接
let db = null

export function getDb() {
  if (!db) {
    db = new sqlite3.Database(dbPath)
  }
  return db
}

// 初始化数据库表
export async function initDatabase() {
  // 确保data目录存在
  const dataDir = join(__dirname, '../../data')
  try {
    await mkdir(dataDir, { recursive: true })
  } catch (err) {
    // 目录可能已存在
  }

  const database = getDb()

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // 创建contents表
      database.run(`
        CREATE TABLE IF NOT EXISTS contents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          source TEXT,
          rating INTEGER CHECK(rating >= 1 AND rating <= 5),
          is_favorite INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // 创建tags表
      database.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // 创建content_tags关联表
      database.run(`
        CREATE TABLE IF NOT EXISTS content_tags (
          content_id INTEGER,
          tag_id INTEGER,
          PRIMARY KEY (content_id, tag_id),
          FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `)

      // 创建annotations表
      database.run(`
        CREATE TABLE IF NOT EXISTS annotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_id INTEGER NOT NULL,
          note TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
        )
      `)

      // 创建access_logs表
      database.run(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_id INTEGER NOT NULL,
          accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Database initialization error:', err)
          reject(err)
        } else {
          console.log('Database initialized successfully')
          resolve()
        }
      })
    })
  })
}

// 执行查询
export function query(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

// 执行单条查询
export function queryOne(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

// 执行插入/更新/删除
export function run(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}
