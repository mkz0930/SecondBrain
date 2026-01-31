import SQLite from 'react-native-sqlite-storage';

/**
 * 离线内容缓存数据库
 * 用于存储离线阅读的内容
 */

SQLite.enablePromise(true);

let db = null;

/**
 * 初始化离线缓存数据库
 */
async function initOfflineDatabase() {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabase({
      name: 'offline_cache.db',
      location: 'default',
    });

    console.log('[OfflineCache] Database opened');

    // 创建离线内容表
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS offline_contents (
        id INTEGER PRIMARY KEY,
        title TEXT,
        content TEXT,
        summary TEXT,
        type TEXT,
        url TEXT,
        source TEXT,
        rating INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        tags TEXT,
        created_at TEXT,
        updated_at TEXT,
        cached_at INTEGER NOT NULL,
        last_read_at INTEGER
      )
    `);

    console.log('[OfflineCache] Table created');

    return db;
  } catch (error) {
    console.error('[OfflineCache] Error initializing database:', error);
    throw error;
  }
}

/**
 * 离线缓存管理类
 */
class OfflineCache {
  constructor(database) {
    this.db = database;
  }

  /**
   * 缓存内容到本地
   */
  async cacheContent(content) {
    const now = Date.now();
    const tagsJson = JSON.stringify(content.tags || []);

    // 检查是否已缓存
    const [existing] = await this.db.executeSql(
      'SELECT id FROM offline_contents WHERE id = ?',
      [content.id],
    );

    if (existing.rows.length > 0) {
      // 更新已有缓存
      await this.db.executeSql(
        `UPDATE offline_contents SET
          title = ?, content = ?, summary = ?, type = ?,
          url = ?, source = ?, rating = ?, is_favorite = ?,
          tags = ?, created_at = ?, updated_at = ?, cached_at = ?
        WHERE id = ?`,
        [
          content.title,
          content.content,
          content.summary,
          content.type,
          content.url,
          content.source,
          content.rating || 0,
          content.is_favorite ? 1 : 0,
          tagsJson,
          content.created_at,
          content.updated_at,
          now,
          content.id,
        ],
      );
      console.log('[OfflineCache] Content updated:', content.id);
    } else {
      // 插入新缓存
      await this.db.executeSql(
        `INSERT INTO offline_contents
          (id, title, content, summary, type, url, source, rating, is_favorite, tags, created_at, updated_at, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          content.id,
          content.title,
          content.content,
          content.summary,
          content.type,
          content.url,
          content.source,
          content.rating || 0,
          content.is_favorite ? 1 : 0,
          tagsJson,
          content.created_at,
          content.updated_at,
          now,
        ],
      );
      console.log('[OfflineCache] Content cached:', content.id);
    }

    return content.id;
  }

  /**
   * 批量缓存内容
   */
  async cacheContents(contents) {
    const results = [];
    for (const content of contents) {
      try {
        await this.cacheContent(content);
        results.push({id: content.id, success: true});
      } catch (error) {
        console.error('[OfflineCache] Error caching content:', content.id, error);
        results.push({id: content.id, success: false, error: error.message});
      }
    }
    return results;
  }

  /**
   * 获取缓存的内容
   */
  async getCachedContent(id) {
    const [results] = await this.db.executeSql(
      'SELECT * FROM offline_contents WHERE id = ?',
      [id],
    );

    if (results.rows.length === 0) {
      return null;
    }

    const row = results.rows.item(0);
    return this.parseContentRow(row);
  }

  /**
   * 获取所有缓存的内容
   */
  async getAllCachedContents(options = {}) {
    const {limit = 100, offset = 0, sortBy = 'cached_at', order = 'DESC'} = options;

    const [results] = await this.db.executeSql(
      `SELECT * FROM offline_contents ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    const contents = [];
    for (let i = 0; i < results.rows.length; i++) {
      contents.push(this.parseContentRow(results.rows.item(i)));
    }

    return contents;
  }

  /**
   * 搜索缓存内容
   */
  async searchCachedContents(query) {
    const searchTerm = `%${query}%`;
    const [results] = await this.db.executeSql(
      `SELECT * FROM offline_contents
       WHERE title LIKE ? OR content LIKE ? OR summary LIKE ?
       ORDER BY cached_at DESC`,
      [searchTerm, searchTerm, searchTerm],
    );

    const contents = [];
    for (let i = 0; i < results.rows.length; i++) {
      contents.push(this.parseContentRow(results.rows.item(i)));
    }

    return contents;
  }

  /**
   * 删除缓存的内容
   */
  async removeCachedContent(id) {
    await this.db.executeSql('DELETE FROM offline_contents WHERE id = ?', [id]);
    console.log('[OfflineCache] Content removed:', id);
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache() {
    await this.db.executeSql('DELETE FROM offline_contents');
    console.log('[OfflineCache] All cache cleared');
  }

  /**
   * 检查内容是否已缓存
   */
  async isContentCached(id) {
    const [results] = await this.db.executeSql(
      'SELECT id FROM offline_contents WHERE id = ?',
      [id],
    );
    return results.rows.length > 0;
  }

  /**
   * 更新最后阅读时间
   */
  async updateLastReadTime(id) {
    await this.db.executeSql(
      'UPDATE offline_contents SET last_read_at = ? WHERE id = ?',
      [Date.now(), id],
    );
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    const [countResult] = await this.db.executeSql(
      'SELECT COUNT(*) as count FROM offline_contents',
    );
    const [sizeResult] = await this.db.executeSql(
      'SELECT SUM(LENGTH(content) + LENGTH(summary) + LENGTH(title)) as size FROM offline_contents',
    );

    return {
      count: countResult.rows.item(0).count,
      sizeBytes: sizeResult.rows.item(0).size || 0,
    };
  }

  /**
   * 解析数据库行
   */
  parseContentRow(row) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      summary: row.summary,
      type: row.type,
      url: row.url,
      source: row.source,
      rating: row.rating,
      is_favorite: row.is_favorite === 1,
      tags: JSON.parse(row.tags || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      cached_at: row.cached_at,
      last_read_at: row.last_read_at,
      isOffline: true,
    };
  }
}

// 单例实例
let cacheInstance = null;

/**
 * 获取离线缓存实例
 */
export async function getOfflineCache() {
  if (!cacheInstance) {
    const database = await initOfflineDatabase();
    cacheInstance = new OfflineCache(database);
  }
  return cacheInstance;
}

export default {getOfflineCache};
