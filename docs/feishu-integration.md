# 飞书集成文档

本文档详细介绍 Second Brain 的飞书（Feishu）集成功能，包括功能概述、使用指南、技术实现、API接口、架构设计和常见问题。

## 目录

- [功能概述](#功能概述)
- [使用指南](#使用指南)
- [技术实现](#技术实现)
- [API接口](#api接口)
- [架构设计](#架构设计)
- [常见问题](#常见问题)
- [实施总结](#实施总结)

---

## 功能概述

本模块实现了本地内容与飞书多维表格的双向同步，支持数据在两端自由流动，方便用户在移动端通过飞书进行知识管理。

### 主要特性

- **双向同步**：支持 Push（本地→飞书）和 Pull（飞书→本地）
- **全内容覆盖**：支持随笔、文章、音视频、书籍所有类型
- **自动同步**：支持定时自动同步（默认15分钟）
- **冲突处理**：采用飞书端优先策略，自动解决数据冲突
- **完整日志**：记录每次同步的详细信息
- **安全加密**：敏感配置信息加密存储

### 应用场景

1. **移动端知识管理**：通过飞书移动应用随时随地查看和编辑内容
2. **团队协作**：将个人知识库分享给团队成员
3. **数据备份**：飞书云端作为额外的数据备份渠道
4. **跨平台访问**：在任何支持飞书的设备上访问知识库

---

## 使用指南

### 前置准备

#### 1. 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 开启机器人能力
4. 获取 **App ID** 和 **App Secret**

#### 2. 配置权限

在应用权限管理中添加以下权限：
- `bitable:app` - 多维表格应用权限
- `bitable:app:readonly` - 多维表格只读权限
- `bitable:app:readwrite` - 多维表格读写权限

#### 3. 创建多维表格

1. 在飞书中创建一个新的多维表格
2. 从 URL 中获取 **Table ID**（格式：`table=xxxx`）
3. 确保应用有权限访问该表格

### 系统配置

#### 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 飞书配置加密密钥（32位随机字符串）
FEISHU_ENCRYPTION_KEY=your-32-char-random-key

# 启用飞书同步
FEISHU_SYNC_ENABLED=true

# 默认同步间隔（分钟）
FEISHU_SYNC_DEFAULT_INTERVAL=15
```

#### API配置

通过前端界面或 API 接口配置飞书应用信息：

```javascript
// POST /api/feishu/config
{
  "enabled": true,
  "appId": "cli_xxxxx",
  "appSecret": "xxxxxxxxxxxx",
  "tableId": "tblxxxxx"
}
```

### 飞书表格字段映射

系统会自动在飞书表格创建以下字段：

| 字段名称 | 类型 | 说明 |
|---------|------|------|
| 记录ID | 单行文本 | 本地唯一标识 |
| 标题 | 单行文本 | 内容标题 |
| 内容类型 | 单选 | 随笔/文章/音视频/书籍 |
| 内容正文 | 多行文本 | 内容主体 |
| 来源 | 单行文本 | URL或出处 |
| 评分 | 数字 | 1-5分 |
| 是否收藏 | 复选框 | 收藏标记 |
| 标签 | 多选 | 内容标签 |
| 创建时间 | 日期时间 | 创建时间戳 |
| 更新时间 | 日期时间 | 最后更新时间戳 |

### 使用流程

#### 初始化同步

1. 完成飞书应用配置
2. 点击"测试连接"确认配置正确
3. 执行"全量导入"将现有本地数据推送到飞书
4. 启用自动同步

#### 日常使用

- **本地创建内容**：自动在下次同步时推送到飞书
- **飞书编辑内容**：自动在下次同步时拉取到本地
- **手动同步**：点击"立即同步"按钮触发即时同步
- **查看日志**：在同步历史中查看每次同步的详细信息

---

## 技术实现

### 核心模块

#### FeishuAdapter (`server/services/feishu-adapter.js`)

飞书 API 适配器，负责与飞书 OpenAPI 的交互：

**主要功能：**
- 认证管理：自动获取和刷新 Tenant Access Token
- API 调用：封装飞书多维表格 API
- 数据转换：本地数据格式 ↔ 飞书记录格式
- 错误处理：API 限流和错误重试机制

**关键方法：**
```javascript
class FeishuAdapter {
  // 获取访问令牌
  async getTenantAccessToken()

  // 获取表格记录
  async getRecords(tableId, viewId)

  // 创建记录
  async createRecord(tableId, fields)

  // 更新记录
  async updateRecord(tableId, recordId, fields)

  // 删除记录
  async deleteRecord(tableId, recordId)

  // 数据格式转换
  transformToFeishu(localContent)
  transformFromFeishu(feishuRecord)
}
```

#### SyncService (`server/services/sync-service.js`)

核心同步逻辑引擎：

**Push 流程（本地→飞书）：**
1. 扫描本地 `updated_at` > 上次同步时间的记录
2. 检查映射表，判断是创建还是更新
3. 调用 FeishuAdapter 推送数据
4. 更新映射表和同步时间戳

**Pull 流程（飞书→本地）：**
1. 获取飞书端所有记录
2. 比对映射表，识别新增、更新、删除
3. 更新本地数据库
4. 更新映射表

**冲突解决策略：**
- 比较两端 `updated_at` 时间戳
- 若冲突，采用飞书端数据覆盖本地（飞书优先）
- 记录冲突日志供用户查看

**关键方法：**
```javascript
class SyncService {
  // 双向同步
  async sync(userId, direction = 'both')

  // 推送到飞书
  async pushToFeishu(userId)

  // 从飞书拉取
  async pullFromFeishu(userId)

  // 冲突解决
  async resolveConflict(localContent, feishuRecord)

  // 记录同步日志
  async logSync(userId, status, details)
}
```

#### SyncScheduler (`server/services/sync-scheduler.js`)

定时同步调度器：

**功能：**
- 基于 `node-cron` 实现定时任务
- 管理同步任务的生命周期（启动、停止、重启）
- 故障自动熔断和恢复
- 支持动态调整同步间隔

**关键方法：**
```javascript
class SyncScheduler {
  // 启动调度器
  start(userId, interval)

  // 停止调度器
  stop(userId)

  // 更新间隔
  updateInterval(userId, newInterval)

  // 获取状态
  getStatus(userId)
}
```

### 数据库设计

#### feishu_sync_config

存储飞书应用配置：

```sql
CREATE TABLE feishu_sync_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  app_id TEXT NOT NULL,
  app_secret TEXT NOT NULL,  -- AES-256 加密存储
  table_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  sync_interval INTEGER DEFAULT 15,  -- 分钟
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### feishu_sync_mapping

记录本地与飞书的映射关系：

```sql
CREATE TABLE feishu_sync_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content_id INTEGER NOT NULL,
  feishu_record_id TEXT NOT NULL,
  last_sync_hash TEXT,  -- 用于变更检测
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_id),
  UNIQUE(user_id, feishu_record_id)
);
```

#### feishu_sync_log

同步历史日志：

```sql
CREATE TABLE feishu_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sync_type TEXT NOT NULL,  -- 'push', 'pull', 'both'
  status TEXT NOT NULL,  -- 'success', 'failed', 'partial'
  message TEXT,
  details TEXT,  -- JSON 格式详细信息
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 安全性设计

#### 加密存储

**App Secret 加密：**
```javascript
const crypto = require('crypto');

// 加密
function encrypt(text, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密
function decrypt(encrypted, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### 访问控制

- 所有飞书 API 需要用户认证
- 配置信息按用户隔离
- App Secret 不在 API 响应中返回

---

## API接口

### 配置管理

#### 获取飞书配置

```
GET /api/feishu/config
```

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "appId": "cli_xxxxx",
    "hasSecret": true,
    "tableId": "tblxxxxx",
    "syncInterval": 15,
    "lastSyncAt": "2024-01-18T10:00:00.000Z"
  }
}
```

**注意：** 出于安全考虑，`appSecret` 不会返回。

#### 保存飞书配置

```
POST /api/feishu/config
```

**请求头：**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "enabled": true,
  "appId": "cli_xxxxx",
  "appSecret": "xxxxxxxxxxxx",
  "tableId": "tblxxxxx",
  "syncInterval": 15
}
```

**响应：**
```json
{
  "success": true,
  "message": "配置已保存"
}
```

#### 测试连接

```
POST /api/feishu/config/test
```

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "message": "连接测试成功",
  "data": {
    "tableInfo": {
      "name": "我的知识库",
      "recordCount": 150
    }
  }
}
```

### 同步操作

#### 手动同步

```
POST /api/feishu/sync
```

**请求头：**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**
```json
{
  "direction": "both"  // "push", "pull", "both"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "added": 5,
    "updated": 10,
    "deleted": 2,
    "errors": 0,
    "duration": 3500  // 毫秒
  }
}
```

#### 获取同步日志

```
GET /api/feishu/logs
```

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页数量，默认 20 |

**响应：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "syncType": "both",
        "status": "success",
        "message": "同步完成",
        "details": {
          "added": 5,
          "updated": 10,
          "deleted": 2
        },
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### 重置并拉取

```
POST /api/feishu/reset
```

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "message": "已重置并开始拉取数据"
}
```

**警告：** 此操作会清空本地内容，从飞书全量拉取，请谨慎使用。

#### 全量导入

```
POST /api/feishu/import-all
```

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "imported": 150,
    "failed": 0
  }
}
```

---

## 架构设计

### 飞书同步架构

```
┌─────────────────────────────────────────────────────────────┐
│                        同步触发                              │
│  (手动触发 / 定时任务 / 配置变更)                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     sync-service.js                         │
│                      开始同步流程                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │   拉取飞书数据     │           │   获取本地变更    │
    │ feishu-adapter   │           │   database.js    │
    └─────────┬────────┘           └─────────┬────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    数据对比        │
                    │  (基于映射表)      │
                    └─────────┬────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │  本地新增    │     │  飞书新增    │     │  双方修改    │
   │ → 推送飞书   │     │  → 拉取本地  │     │  → 冲突解决  │
   └─────────────┘     └─────────────┘     └─────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   更新映射表       │
                    │ feishu_sync_      │
                    │   mapping         │
                    └─────────┬────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   记录同步日志     │
                    └──────────────────┘
```

### 数据映射设计

```
┌─────────────────────────────────────────────────────────────┐
│                   字段映射表                                 │
├─────────────────────────────────────────────────────────────┤
│  本地字段           │  飞书字段            │  转换逻辑        │
├─────────────────────────────────────────────────────────────┤
│  id                │  (不映射)            │  本地自增 ID     │
│  title             │  标题                │  直接映射        │
│  content           │  内容                │  Markdown → 纯文本│
│  type              │  类型                │  直接映射        │
│  source            │  来源                │  直接映射        │
│  rating            │  评分                │  数字 → 星号     │
│  is_favorite       │  收藏                │  boolean → 文字  │
│  created_at        │  创建时间            │  Date → ISO格式  │
│  updated_at        │  更新时间            │  Date → ISO格式  │
│  tags              │  标签                │  数组 → 逗号分隔 │
└─────────────────────────────────────────────────────────────┘
```

### 冲突解决策略

```
┌─────────────────────────────────────────────────────────────┐
│                     冲突检测                                 │
│  比较 updated_at 时间戳                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │   本地较新        │           │   飞书较新        │
    │   → 推送到飞书     │           │   → 拉取到本地    │
    └──────────────────┘           └──────────────────┘
              │
              │ 时间相同
              ▼
    ┌──────────────────┐
    │   保留本地版本    │
    │   (本地优先策略)  │
    └──────────────────┘
```

### 服务层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │feishu-adapter  │  │  sync-service  │                     │
│  │     .js        │  │       .js      │                     │
│  │ - API 封装      │  │ - 双向同步      │                     │
│  │ - 数据转换      │  │ - 冲突解决      │                     │
│  │ - 令牌管理      │  │ - 增量同步      │                     │
│  └────────────────┘  └────────────────┘                     │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │sync-scheduler  │  │  sync-state    │                     │
│  │     .js        │  │      .js       │                     │
│  │ - Cron 调度     │  │ - 状态管理      │                     │
│  │ - 任务注册      │  │ - 进度跟踪      │                     │
│  └────────────────┘  └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 常见问题

### 同步相关

**Q: 同步失败怎么办？**

A: 检查以下几点：
1. 查看同步日志中的错误信息
2. 确认飞书应用配置正确（App ID、Secret、Table ID）
3. 检查网络连接是否正常
4. 确认飞书应用权限是否完整
5. Token 过期会自动刷新，如果持续失败请重新配置

**Q: 如何处理数据冲突？**

A: 系统采用飞书优先策略：
- 当本地和飞书同时修改同一条记录时，以飞书端数据为准
- 冲突会记录在同步日志中
- 建议在单一端进行编辑，避免冲突

**Q: 同步频率如何设置？**

A:
- 默认 15 分钟自动同步一次
- 可在配置中调整间隔（最小 5 分钟）
- 支持手动触发即时同步
- 频繁同步可能触发 API 限流

### 配置相关

**Q: 如何获取 Table ID？**

A:
1. 在飞书中打开多维表格
2. 查看浏览器地址栏
3. 找到 `table=` 后面的字符串
4. 例如：`https://xxx.feishu.cn/base/xxx?table=tblxxxxx`

**Q: App Secret 安全吗？**

A:
- App Secret 使用 AES-256 加密存储
- 加密密钥由环境变量 `FEISHU_ENCRYPTION_KEY` 提供
- API 响应中不会返回 Secret
- 建议定期更换 Secret

**Q: 支持多个飞书表格吗？**

A:
- 当前版本每个用户只支持一个表格
- 未来版本计划支持多表格同步

### 数据相关

**Q: 本地删除的内容会同步到飞书吗？**

A:
- 本地删除（软删除）不会同步到飞书
- 飞书删除的记录会在本地标记为删除
- 可通过"重置并拉取"功能重新同步

**Q: 标签如何同步？**

A:
- 本地标签数组转换为飞书多选字段
- 飞书端新增标签会自动创建到本地
- 标签颜色信息不同步（飞书不支持）

**Q: 附件和图片能同步吗？**

A:
- 当前版本不支持附件和图片同步
- 仅同步文本内容
- 图片 URL 会作为文本保留

### 性能相关

**Q: 大量数据同步会很慢吗？**

A:
- 首次全量同步可能较慢（取决于数据量）
- 后续采用增量同步，只同步变更部分
- 建议分批导入大量历史数据

**Q: 会影响系统性能吗？**

A:
- 同步任务在后台异步执行
- 不会阻塞主线程
- 可通过调整同步间隔控制资源占用

### 故障排查

**Q: Token 获取失败？**

A:
1. 确认 App ID 和 Secret 正确
2. 检查应用是否已发布
3. 确认应用状态正常（未被停用）

**Q: 权限不足错误？**

A:
1. 检查应用权限配置
2. 确认已添加必要的 bitable 权限
3. 重新发布应用使权限生效

**Q: 数据不一致怎么办？**

A:
1. 查看同步日志定位问题
2. 使用"重置并拉取"功能重新同步
3. 备份数据后重新配置

---

## 实施总结

### 完成时间

飞书集成功能于 **2026-01-12** 完成实施并投入使用。

### 实现功能

- ✅ 双向同步（Push/Pull）
- ✅ 自动定时同步
- ✅ 冲突自动解决
- ✅ 完整的同步日志
- ✅ 安全的配置加密
- ✅ 友好的 API 接口
- ✅ 详细的错误处理

### 技术栈

- **后端框架**：Express.js
- **数据库**：SQLite
- **定时任务**：node-cron
- **加密算法**：AES-256-CBC
- **日志系统**：Winston
- **API 客户端**：Axios

### 代码结构

```
server/
├── routes/
│   └── feishu.js              # 飞书 API 路由
├── services/
│   ├── feishu-adapter.js      # 飞书 API 适配器
│   ├── sync-service.js        # 同步服务
│   ├── sync-scheduler.js      # 定时调度器
│   └── sync-state.js          # 状态管理
└── models/
    └── database.js            # 数据库操作
```

### 性能指标

- **首次同步**：约 100 条/分钟
- **增量同步**：约 200 条/分钟
- **API 调用**：平均响应时间 < 500ms
- **内存占用**：< 50MB（同步进行时）

### 已知限制

1. 每个用户仅支持一个飞书表格
2. 不支持附件和图片同步
3. 标签颜色信息不同步
4. 受飞书 API 限流限制（每分钟 100 次）

### 未来改进方向

1. **多表格支持**：允许用户配置多个飞书表格
2. **附件同步**：支持图片和文件附件同步
3. **实时同步**：基于 Webhook 实现实时数据同步
4. **冲突策略**：提供更多冲突解决策略选项
5. **批量操作**：优化大批量数据同步性能
6. **同步预览**：同步前预览将要执行的操作

### 维护建议

1. **定期备份**：建议每周备份 `data/brain.db`
2. **日志清理**：定期清理过期的同步日志
3. **监控告警**：监控同步失败率，及时处理异常
4. **密钥轮换**：定期更换 `FEISHU_ENCRYPTION_KEY`
5. **权限审计**：定期检查飞书应用权限配置

---

**文档版本：** 1.0.0
**最后更新：** 2026-01-21
**维护者：** Second Brain 开发团队
