import SQLite from 'react-native-sqlite-storage';

/**
 * 剪切板队列数据库
 * 用于离线存储和同步管理
 */

SQLite.enablePromise(true);

let db = null;

/**
 * 初始化数据库
 */
async function initDatabase() {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabase({
      name: 'clipboard_queue.db',
      location: 'default',
    });

    console.log('[ClipboardQueue] Database opened');

    // 创建表
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS clipboard_queue (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        clipboard_timestamp INTEGER NOT NULL,
        status TEXT CHECK(status IN ('pending', 'processing', 'synced', 'failed')) DEFAULT 'pending',

        -- 缓存的内容
        fetched_title TEXT,
        fetched_content TEXT,
        fetched_at INTEGER,

        -- AI 分析结果
        analyzed_title TEXT,
        analyzed_summary TEXT,
        analyzed_type TEXT,
        analyzed_tags TEXT,
        analyzed_at INTEGER,

        -- 同步状态
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        synced_at INTEGER,

        -- 服务器返回的 ID
        server_id INTEGER
      )
    `);

    console.log('[ClipboardQueue] Table created');

    return db;
  } catch (error) {
    console.error('[ClipboardQueue] Error initializing database:', error);
    throw error;
  }
}

/**
 * 剪切板队列管理类
 */
class ClipboardQueue {
  constructor(database) {
    this.db = database;
  }

  /**
   * 添加新项目到队列
   */
  async addItem(url) {
    const id = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await this.db.executeSql(
      `INSERT INTO clipboard_queue (id, url, clipboard_timestamp, created_at, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [id, url, now, now],
    );

    console.log('[ClipboardQueue] Item added:', id);
    return id;
  }

  /**
   * 获取待处理的项目
   */
  async getPendingItems(limit = 10) {
    const [results] = await this.db.executeSql(
      `SELECT * FROM clipboard_queue
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit],
    );

    const items = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(results.rows.item(i));
    }

    return items;
  }

  /**
   * 更新项目状态
   */
  async updateItemStatus(id, status, updates = {}) {
    const fields = ['status = ?'];
    const values = [status];

    if (updates.server_id) {
      fields.push('server_id = ?');
      values.push(updates.server_id);
    }

    if (updates.synced_at) {
      fields.push('synced_at = ?');
      values.push(updates.synced_at);
    }

    if (updates.retry_count !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retry_count);
    }

    if (updates.last_error) {
      fields.push('last_error = ?');
      values.push(updates.last_error);
    }

    if (updates.fetched_title) {
      fields.push('fetched_title = ?', 'fetched_content = ?', 'fetched_at = ?');
      values.push(updates.fetched_title, updates.fetched_content, Date.now());
    }

    if (updates.analyzed_title) {
      fields.push(
        'analyzed_title = ?',
        'analyzed_summary = ?',
        'analyzed_type = ?',
        'analyzed_tags = ?',
        'analyzed_at = ?',
      );
      values.push(
        updates.analyzed_title,
        updates.analyzed_summary,
        updates.analyzed_type,
        updates.analyzed_tags,
        Date.now(),
      );
    }

    values.push(id);

    await this.db.executeSql(
      `UPDATE clipboard_queue SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );

    console.log('[ClipboardQueue] Item updated:', id, status);
  }

  /**
   * 删除项目
   */
  async deleteItem(id) {
    await this.db.executeSql('DELETE FROM clipboard_queue WHERE id = ?', [id]);
    console.log('[ClipboardQueue] Item deleted:', id);
  }

  /**
   * 获取所有项目（用于调试）
   */
  async getAllItems() {
    const [results] = await this.db.executeSql(
      'SELECT * FROM clipboard_queue ORDER BY created_at DESC',
    );

    const items = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(results.rows.item(i));
    }

    return items;
  }

  /**
   * 清空已同步的项目
   */
  async clearSyncedItems() {
    await this.db.executeSql(
      "DELETE FROM clipboard_queue WHERE status = 'synced'",
    );
    console.log('[ClipboardQueue] Synced items cleared');
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const [results] = await this.db.executeSql(`
      SELECT
        status,
        COUNT(*) as count
      FROM clipboard_queue
      GROUP BY status
    `);

    const stats = {
      pending: 0,
      processing: 0,
      synced: 0,
      failed: 0,
    };

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      stats[row.status] = row.count;
    }

    return stats;
  }
}

/**
 * 获取队列实例
 */
export async function getClipboardQueue() {
  const database = await initDatabase();
  return new ClipboardQueue(database);
}
