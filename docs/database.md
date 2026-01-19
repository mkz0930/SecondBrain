# 数据库设计文档

本文档详细说明 Second Brain 的数据库结构和设计。

## 目录

- [概述](#概述)
- [核心表结构](#核心表结构)
- [飞书同步表](#飞书同步表)
- [索引设计](#索引设计)
- [关系图](#关系图)
- [迁移策略](#迁移策略)

---

## 概述

### 数据库选择

**SQLite** 是本项目选择的数据库，原因如下：

| 优势 | 说明 |
|------|------|
| 零配置 | 无需数据库服务器，文件即数据库 |
| 轻量级 | 适合个人应用，资源占用低 |
| 可移植 | 单文件存储，便于备份和迁移 |
| 足够功能 | 支持事务、索引、外键等必要特性 |

### 数据库文件

- **位置**: `data/brain.db`
- **大小**: 根据内容量增长
- **备份**: 直接复制文件即可

### 设计原则

- **软删除**: 使用 `deleted_at` 标记删除，不物理删除数据
- **时间戳**: 所有表包含 `created_at` 和 `updated_at`
- **用户隔离**: 所有数据通过 `user_id` 隔离
- **自动迁移**: 支持字段自动添加，无需手动执行迁移

---

## 核心表结构

### users - 用户表

```sql
CREATE TABLE users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  openid              TEXT UNIQUE,              -- 微信 OpenID
  username            TEXT UNIQUE,              -- 用户名
  password_hash       TEXT,                     -- 密码哈希
  session_token       TEXT,                     -- 会话令牌
  session_expires_at  DATETIME,                 -- 会话过期时间
  last_login_at       DATETIME,                 -- 最后登录时间
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| openid | TEXT | UNIQUE | 微信 OpenID（预留） |
| username | TEXT | UNIQUE | 用户名 |
| password_hash | TEXT | - | bcrypt 哈希密码 |
| session_token | TEXT | - | JWT Token |
| session_expires_at | DATETIME | - | Token 过期时间 |
| last_login_at | DATETIME | - | 最后登录时间 |

### contents - 内容表

```sql
CREATE TABLE contents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,                          -- 所属用户
  type        TEXT NOT NULL,                    -- 内容类型
  title       TEXT NOT NULL,                    -- 标题
  content     TEXT,                             -- 正文内容
  summary     TEXT,                             -- AI 摘要
  url         TEXT,                             -- 来源 URL
  source      TEXT,                             -- 来源名称
  rating      INTEGER CHECK(rating >= 1 AND rating <= 5),  -- 评分 1-5
  is_favorite INTEGER DEFAULT 0,                -- 收藏标记
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME                          -- 软删除时间戳
);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| user_id | INTEGER | FK | 所属用户 ID |
| type | TEXT | NOT NULL | 类型：随笔/文章/音视频/书籍/公众号/抖音/文档/其他 |
| title | TEXT | NOT NULL | 标题 |
| content | TEXT | - | Markdown 格式正文 |
| summary | TEXT | - | AI 生成的摘要 |
| url | TEXT | - | 来源链接 |
| source | TEXT | - | 来源名称（如网站名） |
| rating | INTEGER | CHECK | 1-5 星评分 |
| is_favorite | INTEGER | DEFAULT 0 | 0/1 是否收藏 |
| deleted_at | DATETIME | - | 软删除标记（非空=已删除） |

**内容类型枚举：**

| 值 | 说明 |
|---|------|
| 随笔 | 日常想法、零散笔记 |
| 文章 | 有结构的完整文章 |
| 音视频 | 音频、视频内容 |
| 书籍 | 书籍阅读记录 |
| 公众号 | 公众号文章（AI 识别） |
| 抖音 | 抖音内容（AI 识别） |
| 文档 | 文档资料（AI 识别） |
| 其他 | 其他类型（AI 识别） |

### tags - 标签表

```sql
CREATE TABLE tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,                    -- 标签名称
  color      TEXT,                             -- 标签颜色（十六进制）
  user_id    INTEGER,                          -- 所属用户
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id)                        -- 同一用户下标签名唯一
);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| name | TEXT | NOT NULL | 标签名称 |
| color | TEXT | - | 颜色值，如 #3B82F6 |
| user_id | INTEGER | FK | 所属用户 ID |

### content_tags - 内容标签关联表

```sql
CREATE TABLE content_tags (
  content_id INTEGER,
  tag_id     INTEGER,
  PRIMARY KEY (content_id, tag_id),
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

多对多关系，实现内容与标签的关联。

### annotations - 批注表

```sql
CREATE TABLE annotations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,                 -- 关联内容
  note       TEXT NOT NULL,                    -- 批注内容
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

用于对内容添加批注（当前版本未完全使用）。

### access_logs - 访问日志表

```sql
CREATE TABLE access_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id  INTEGER NOT NULL,                -- 被访问内容
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 访问时间
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

记录内容访问历史，用于统计热门内容。

### daily_summaries - 每日总结表

```sql
CREATE TABLE daily_summaries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL UNIQUE,             -- 日期（YYYY-MM-DD）
  summary    TEXT NOT NULL,                    -- 总结内容
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK | 主键 |
| date | TEXT | UNIQUE | 日期字符串 YYYY-MM-DD |
| summary | TEXT | NOT NULL | AI 生成的日报内容 |

---

## 飞书同步表

### feishu_sync_config - 飞书配置表

```sql
CREATE TABLE feishu_sync_config (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,          -- 所属用户
  app_id            TEXT NOT NULL,             -- 飞书 App ID
  app_secret        TEXT NOT NULL,             -- 飞书 App Secret（加密）
  access_token      TEXT,                      -- 访问令牌
  token_expires_at  DATETIME,                  -- 令牌过期时间
  table_id          TEXT NOT NULL,             -- 飞书表格 ID
  enabled           INTEGER DEFAULT 1,         -- 是否启用
  sync_interval     INTEGER DEFAULT 15,        -- 同步间隔（分钟）
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### feishu_sync_mapping - 飞书记录映射表

```sql
CREATE TABLE feishu_sync_mapping (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id        INTEGER NOT NULL UNIQUE,   -- 本地内容 ID
  feishu_record_id  TEXT NOT NULL,             -- 飞书记录 ID
  local_updated_at  DATETIME,                  -- 本地更新时间
  feishu_updated_at DATETIME,                  -- 飞书更新时间
  last_sync_at      DATETIME,                  -- 最后同步时间
  sync_direction    TEXT,                      -- 同步方向
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

用于追踪本地内容与飞书记录的对应关系，实现增量同步和冲突检测。

### feishu_sync_log - 飞书同步日志表

```sql
CREATE TABLE feishu_sync_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,             -- 执行同步的用户
  sync_type      TEXT NOT NULL,                -- 同步类型（full/incremental）
  start_at       DATETIME NOT NULL,            -- 开始时间
  end_at         DATETIME,                     -- 结束时间
  status         TEXT NOT NULL,                -- 状态（success/failed/running）
  total_count    INTEGER DEFAULT 0,            -- 总记录数
  success_count  INTEGER DEFAULT 0,            -- 成功数
  failed_count   INTEGER DEFAULT 0,            -- 失败数
  conflict_count INTEGER DEFAULT 0,            -- 冲突数
  error_message  TEXT,                         -- 错误信息
  details        TEXT,                         -- 详细信息（JSON）
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 索引设计

### 用户相关索引

```sql
-- 会话令牌索引（用于认证）
CREATE INDEX idx_users_session_token ON users(session_token);

-- 用户名唯一索引
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

### 内容相关索引

```sql
-- 用户和更新时间复合索引（用于时间线查询）
CREATE INDEX idx_contents_user_updated ON contents(user_id, updated_at);
```

### 飞书同步索引

```sql
-- 映射表内容索引
CREATE INDEX idx_feishu_mapping_content ON feishu_sync_mapping(content_id);

-- 映射表飞书记录索引
CREATE INDEX idx_feishu_mapping_record ON feishu_sync_mapping(feishu_record_id);

-- 同步日志用户时间索引
CREATE INDEX idx_feishu_log_user_time ON feishu_sync_log(user_id, start_at DESC);

-- 配置表用户索引
CREATE INDEX idx_feishu_config_user ON feishu_sync_config(user_id);
```

### 索引使用建议

| 查询场景 | 使用索引 |
|----------|----------|
| 用户登录 | `idx_users_session_token` |
| 获取内容列表 | `idx_contents_user_updated` |
| 同步状态查询 | `idx_feishu_mapping_content` |
| 同步历史查询 | `idx_feishu_log_user_time` |

---

## 关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                         数据库关系图                              │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │    users     │
    │──────────────│
    │ id (PK)      │──┐
    │ username     │  │
    │ password_hash│  │
    └──────────────┘  │
                      │ one-to-many
        ┌─────────────┼─────────────────┬──────────────┐
        │             │                 │              │
        ▼             ▼                 ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────────┐
│  contents    │ │     tags     │ │  daily_   │ │feishu_sync_  │
│──────────────│ │──────────────│ │ summaries │ │   config     │
│ id (PK)      │ │ id (PK)      │ │───────────│ │──────────────│
│ user_id (FK) │ │ user_id (FK) │ │ id (PK)   │ │ id (PK)      │
│ type         │ │ name         │ │ date      │ │ user_id (FK) │
│ title        │ │ color        │ │ summary   │ │ app_id       │
│ content      │ └──────┬───────┘ └───────────┘ │ app_secret   │
│ summary      │        │                          └──────┬───────┘
│ rating       │        │ many-to-many                 │
│ is_favorite  │        │                              │ one-to-many
│ deleted_at   │        ▼                              │
└──────┬───────┘ ┌──────────────┐                     ▼
       │         │content_tags  │            ┌──────────────┐
       │         │──────────────│            │feishu_sync_  │
       │         │ content_id   │            │   mapping    │
       │         │ tag_id       │            │──────────────│
       │         └──────────────┘            │ content_id   │
       │                                    │ feishu_record│
       │                                    └──────┬───────┘
       │                                           │
       │                 ┌─────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐ ┌──────────────┐
│ access_logs  │ │feishu_sync_  │
│──────────────│ │    log       │
│ content_id   │ │──────────────│
└──────────────┘ │ user_id      │
                 │ status       │
                 └──────────────┘
```

---

## 迁移策略

### 自动迁移机制

项目使用自动迁移机制，在启动时检查并添加新字段：

```javascript
// database.js 中的 ensureColumn 函数
async function ensureColumn(database, table, column, ddl) {
  const columns = await allAsync(database, `PRAGMA table_info(${table})`)
  const exists = columns.some((col) => col.name === column)
  if (!exists) {
    await runAsync(database, ddl)  // 执行 ALTER TABLE ADD COLUMN
  }
}
```

### 迁移示例

**添加 summary 字段：**

```sql
-- 检测字段不存在时自动执行
ALTER TABLE contents ADD COLUMN summary TEXT;
```

**标签表重建：**

当需要添加唯一约束时，系统会重建表：

```sql
ALTER TABLE tags RENAME TO tags_old;

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id)  -- 添加唯一约束
);

INSERT INTO tags SELECT * FROM tags_old;
DROP TABLE tags_old;
```

### 添加新字段的步骤

1. 在 `initDatabase()` 中添加 `ensureColumn()` 调用
2. 重启服务器，字段会自动添加
3. 无需手动执行 SQL

---

## 数据维护

### 备份

```bash
# Windows
copy data\brain.db backup\brain_%date%.db

# Linux/Mac
cp data/brain.db backup/brain_$(date +%Y%m%d).db
```

### 恢复

```bash
# 停止服务器
# 恢复备份
copy backup\brain_20240118.db data\brain.db

# 重启服务器
npm run server
```

### 清理访问日志

```sql
-- 删除 30 天前的访问日志
DELETE FROM access_logs
WHERE accessed_at < datetime('now', '-30 days');
```

### 清空软删除数据

```sql
-- 确认后删除软删除的内容
DELETE FROM contents
WHERE deleted_at IS NOT NULL
AND deleted_at < datetime('now', '-90 days');
```

---

## 查询示例

### 获取用户内容列表

```sql
SELECT c.*, GROUP_CONCAT(t.name) as tags
FROM contents c
LEFT JOIN content_tags ct ON c.id = ct.content_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.user_id = ? AND c.deleted_at IS NULL
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT ? OFFSET ?;
```

### 统计各类型内容数量

```sql
SELECT type, COUNT(*) as count
FROM contents
WHERE user_id = ? AND deleted_at IS NULL
GROUP BY type;
```

### 获取热门内容（按访问量）

```sql
SELECT c.*, COUNT(al.id) as access_count
FROM contents c
LEFT JOIN access_logs al ON c.id = al.content_id
WHERE c.user_id = ? AND c.deleted_at IS NULL
GROUP BY c.id
ORDER BY access_count DESC
LIMIT 10;
```

### 搜索内容

```sql
SELECT * FROM contents
WHERE user_id = ?
AND deleted_at IS NULL
AND (title LIKE ? OR content LIKE ?)
ORDER BY updated_at DESC;
```

---

**文档版本:** 1.0.0
**最后更新:** 2024-01-18
