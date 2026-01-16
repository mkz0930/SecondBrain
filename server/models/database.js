import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdir } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '../../data/brain.db')

let db = null

export function getDb() {
  if (!db) {
    db = new sqlite3.Database(dbPath)
  }
  return db
}

function runAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function allAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function ensureColumn(database, table, column, ddl) {
  const columns = await allAsync(database, `PRAGMA table_info(${table})`)
  const exists = columns.some((col) => col.name === column)
  if (!exists) {
    await runAsync(database, ddl)
  }
}

async function shouldRebuildTags(database) {
  const columns = await allAsync(database, 'PRAGMA table_info(tags)')
  if (columns.length == 0) {
    return false
  }
  const hasUserId = columns.some((col) => col.name == 'user_id')
  if (!hasUserId) {
    return true
  }
  const indexes = await allAsync(database, 'PRAGMA index_list(tags)')
  for (const idx of indexes) {
    if (!idx.unique) continue
    const info = await allAsync(database, `PRAGMA index_info(${idx.name})`)
    const names = info.map((col) => col.name)
    if (names.length == 2 && names[0] == 'name' && names[1] == 'user_id') {
      return false
    }
  }
  return true
}

async function rebuildTagsTable(database) {
  const columns = await allAsync(database, 'PRAGMA table_info(tags)')
  const hasUserId = columns.some((col) => col.name == 'user_id')
  const userIdSelect = hasUserId ? 'user_id' : 'NULL as user_id'

  await runAsync(database, 'ALTER TABLE tags RENAME TO tags_old')
  await runAsync(
    database,
    `CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, user_id)
    )`
  )
  await runAsync(
    database,
    `INSERT INTO tags (id, name, color, user_id, created_at)
     SELECT id, name, color, ${userIdSelect}, created_at FROM tags_old`
  )
  await runAsync(database, 'DROP TABLE tags_old')
}

export async function initDatabase() {
  const dataDir = join(__dirname, '../../data')
  try {
    await mkdir(dataDir, { recursive: true })
  } catch (err) {
    // ignore if directory exists
  }

  const database = getDb()

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      ;(async () => {
        try {
          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              openid TEXT UNIQUE,
              session_token TEXT,
              session_expires_at DATETIME,
              last_login_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS contents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              content TEXT,
              url TEXT,
              source TEXT,
              rating INTEGER CHECK(rating >= 1 AND rating <= 5),
              is_favorite INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS tags (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              color TEXT,
              user_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(name, user_id)
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS content_tags (
              content_id INTEGER,
              tag_id INTEGER,
              PRIMARY KEY (content_id, tag_id),
              FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
              FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS annotations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              content_id INTEGER NOT NULL,
              note TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS access_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              content_id INTEGER NOT NULL,
              accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
            )`
          )

          await ensureColumn(
            database,
            'contents',
            'summary',
            'ALTER TABLE contents ADD COLUMN summary TEXT'
          )
          await ensureColumn(
            database,
            'contents',
            'url',
            'ALTER TABLE contents ADD COLUMN url TEXT'
          )
          await ensureColumn(
            database,
            'contents',
            'user_id',
            'ALTER TABLE contents ADD COLUMN user_id INTEGER'
          )
          await ensureColumn(
            database,
            'contents',
            'deleted_at',
            'ALTER TABLE contents ADD COLUMN deleted_at DATETIME'
          )
          await ensureColumn(
            database,
            'tags',
            'user_id',
            'ALTER TABLE tags ADD COLUMN user_id INTEGER'
          )
          await ensureColumn(
            database,
            'users',
            'username',
            'ALTER TABLE users ADD COLUMN username TEXT'
          )
          await ensureColumn(
            database,
            'users',
            'password_hash',
            'ALTER TABLE users ADD COLUMN password_hash TEXT'
          )

          if (await shouldRebuildTags(database)) {
            await rebuildTagsTable(database)
          }

          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token)'
          )
          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_contents_user_updated ON contents(user_id, updated_at)'
          )
          await runAsync(
            database,
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'
          )

          // 飞书同步相关表
          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS feishu_sync_config (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              app_id TEXT NOT NULL,
              app_secret TEXT NOT NULL,
              access_token TEXT,
              token_expires_at DATETIME,
              table_id TEXT NOT NULL,
              enabled INTEGER DEFAULT 1,
              sync_interval INTEGER DEFAULT 15,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS feishu_sync_mapping (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              content_id INTEGER NOT NULL,
              feishu_record_id TEXT NOT NULL,
              local_updated_at DATETIME,
              feishu_updated_at DATETIME,
              last_sync_at DATETIME,
              sync_direction TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(content_id),
              FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
            )`
          )

          await runAsync(
            database,
            `CREATE TABLE IF NOT EXISTS feishu_sync_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              sync_type TEXT NOT NULL,
              start_at DATETIME NOT NULL,
              end_at DATETIME,
              status TEXT NOT NULL,
              total_count INTEGER DEFAULT 0,
              success_count INTEGER DEFAULT 0,
              failed_count INTEGER DEFAULT 0,
              conflict_count INTEGER DEFAULT 0,
              error_message TEXT,
              details TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
          )

          // 创建飞书同步相关索引
          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_feishu_mapping_content ON feishu_sync_mapping(content_id)'
          )
          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_feishu_mapping_record ON feishu_sync_mapping(feishu_record_id)'
          )
          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_feishu_log_user_time ON feishu_sync_log(user_id, start_at DESC)'
          )
          await runAsync(
            database,
            'CREATE INDEX IF NOT EXISTS idx_feishu_config_user ON feishu_sync_config(user_id)'
          )

          console.log('Database initialized successfully (including Feishu sync tables)')
          resolve()
        } catch (err) {
          console.error('Database initialization error:', err)
          reject(err)
        }
      })()
    })
  })
}

export function query(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

export function queryOne(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

export function run(sql, params = []) {
  const database = getDb()
  return new Promise((resolve, reject) => {
    database.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}
