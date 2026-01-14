# 飞书多维表格集成使用指南

## 功能概述

本系统集成了飞书多维表格，支持双向同步本地内容与飞书表格之间的数据，方便在手机端通过飞书快速记录和查看知识内容。

### 主要特性

- ✅ **双向同步**：本地内容与飞书表格之间的数据双向流动
- ✅ **全内容覆盖**：支持所有内容类型（随笔、文章、音视频、书籍）
- ✅ **自动同步**：可配置定时自动同步（默认15分钟）
- ✅ **冲突处理**：采用飞书端优先策略，自动解决数据冲突
- ✅ **完整日志**：记录每次同步的详细信息，便于问题排查

## 前置准备

### 1. 创建飞书个人应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 登录后点击「创建企业自建应用」
3. 填写应用名称和描述（如：外挂大脑同步）
4. 记录 **App ID** 和 **App Secret**

### 2. 配置应用权限

在应用管理页面，添加以下权限：

- `bitable:app` - 多维表格应用权限
- `bitable:app:readonly` - 多维表格只读权限  
- `bitable:app:readwrite` - 多维表格读写权限

### 3. 创建飞书多维表格

1. 在飞书中创建新的多维表格
2. 表格名称建议：`外挂大脑内容库`
3. 记录表格的 **Table ID**（从浏览器地址栏获取，格式：`appToken_tableId`）

**获取Table ID的方法：**
- 在浏览器中打开飞书多维表格
- 地址栏格式：`https://xxx.feishu.cn/base/[appToken]?table=[tableId]`
- 将 appToken 和 tableId 用下划线连接，如：`bascxxxxxx_tblyyyyy`

## 系统配置

### 1. 环境变量配置

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下配置：

```env
# 飞书加密密钥（32位随机字符串，用于加密存储app_secret）
FEISHU_ENCRYPTION_KEY=your-32-character-random-string

# 是否启用飞书自动同步
FEISHU_SYNC_ENABLED=true

# 默认同步间隔（分钟）
FEISHU_SYNC_DEFAULT_INTERVAL=15
```

**重要：** 请务必修改 `FEISHU_ENCRYPTION_KEY` 为一个安全的随机字符串！

生成随机密钥的方法：
```bash
# Linux/Mac
openssl rand -hex 16

# Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 2. 启动服务

```bash
# 安装依赖
npm install

# 启动服务
npm run server
```

服务启动后，会自动：
- 创建飞书同步相关的数据库表
- 启动定时同步调度器（如果启用）

## Web端使用说明

### 1. 配置飞书集成

访问系统设置页面（规划中），配置飞书集成信息：

1. 输入飞书应用 **App ID**
2. 输入飞书应用 **App Secret**
3. 输入飞书多维表格 **Table ID**
4. 设置自动同步间隔（可选，默认15分钟）
5. 点击「测试连接」验证配置
6. 点击「保存配置」

### 2. 首次同步

配置完成后，建议进行一次全量导入：

1. 点击「全量导入到飞书」按钮
2. 系统会将所有本地内容推送到飞书表格
3. 等待同步完成，查看同步日志

### 3. 日常使用

配置完成后，系统会自动按设置的间隔进行同步：

- **手动触发同步**：点击「立即同步」按钮
- **查看同步历史**：在同步历史区域查看每次同步的结果
- **启用/禁用同步**：使用开关控制自动同步

## API接口说明

### 配置管理

#### 获取配置
```
GET /api/feishu/config
Authorization: Bearer {token}

Response:
{
  "configured": true,
  "app_id": "cli_xxxx",
  "table_id": "bascxxxx_tblxxxx",
  "sync_interval": 15,
  "enabled": true,
  "last_sync_at": "2024-01-12T10:00:00Z"
}
```

#### 保存配置
```
POST /api/feishu/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "app_id": "cli_xxxx",
  "app_secret": "xxxx",
  "table_id": "bascxxxx_tblxxxx",
  "sync_interval": 15
}

Response:
{
  "message": "Configuration saved successfully",
  "config_id": 1
}
```

#### 测试连接
```
POST /api/feishu/config/test
Content-Type: application/json

{
  "app_id": "cli_xxxx",
  "app_secret": "xxxx",
  "table_id": "bascxxxx_tblxxxx"
}

Response:
{
  "success": true,
  "message": "Connection successful",
  "table_name": "外挂大脑内容库"
}
```

### 同步操作

#### 手动触发同步
```
POST /api/feishu/sync
Authorization: Bearer {token}
Content-Type: application/json

{
  "direction": "both"  // both/push/pull
}

Response:
{
  "message": "Sync started",
  "status": "running"
}
```

#### 获取同步历史
```
GET /api/feishu/sync/history?page=1&limit=20
Authorization: Bearer {token}

Response:
{
  "data": [
    {
      "id": 1,
      "sync_type": "manual",
      "start_at": "2024-01-12T10:00:00Z",
      "end_at": "2024-01-12T10:01:00Z",
      "status": "success",
      "total_count": 50,
      "success_count": 48,
      "failed_count": 2,
      "conflict_count": 3
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 全量导入到飞书
```
POST /api/feishu/import-all
Authorization: Bearer {token}

Response:
{
  "message": "Import started",
  "status": "running",
  "total_count": 200
}
```

## 飞书表格字段说明

系统会在飞书表格中创建以下字段：

| 字段名称 | 类型 | 说明 |
|---------|------|------|
| 记录ID | 单行文本 | 本地数据库的内容ID |
| 标题 | 单行文本 | 内容标题 |
| 内容类型 | 单选 | 随笔/文章/音视频/书籍 |
| 内容正文 | 多行文本 | 内容详情 |
| 来源 | 单行文本 | 内容来源URL或说明 |
| 评分 | 数字 | 1-5星评分 |
| 是否收藏 | 复选框 | 收藏状态 |
| 标签 | 多选 | 关联的标签列表 |
| 创建时间 | 日期时间 | 创建时间戳 |
| 更新时间 | 日期时间 | 最后修改时间戳 |
| 记录来源 | 单选 | 本地/飞书 |

## 同步机制说明

### 双向同步流程

1. **推送到飞书（Push）**
   - 检测本地新增、修改、删除的内容
   - 批量推送到飞书表格
   - 更新同步映射表

2. **拉取到本地（Pull）**
   - 获取飞书表格的所有记录
   - 检测飞书端的新增和修改
   - 同步到本地数据库

3. **冲突处理**
   - 检测同一记录在两端都有修改
   - 采用**飞书端优先**策略
   - 记录冲突详情到日志

### 自动同步调度

- 默认每15分钟执行一次自动同步
- 连续失败3次自动禁用同步
- 可通过配置调整同步间隔（5-60分钟）

## 常见问题

### Q1: 如何处理同步冲突？

系统采用**飞书端优先**策略。当同一条记录在本地和飞书都有修改时，飞书的数据会覆盖本地数据。所有冲突都会记录在同步日志中。

### Q2: 同步失败怎么办？

1. 查看同步历史，找到失败的记录
2. 检查错误信息
3. 常见原因：
   - 网络连接问题
   - 飞书token过期
   - API调用限流
   - 数据格式错误

### Q3: 可以只同步部分内容吗？

当前版本同步所有内容类型。未来版本会支持选择性同步（按标签、评分、时间筛选）。

### Q4: 飞书端删除的内容会同步到本地吗？

目前不支持飞书端删除同步到本地。建议使用本地系统进行内容管理。

### Q5: 如何停止自动同步？

1. Web端：在配置页面关闭同步开关
2. 环境变量：设置 `FEISHU_SYNC_ENABLED=false`

## 性能优化建议

### 1. 批量操作

系统优先使用飞书批量API，单次最多处理500条记录。

### 2. 同步间隔

根据内容更新频率调整：
- 频繁更新：5-10分钟
- 正常使用：15-30分钟
- 较少更新：30-60分钟

### 3. 网络优化

- 确保服务器网络稳定
- 避免在网络高峰期进行大量同步

## 安全注意事项

1. **保护敏感信息**
   - 不要将 `.env` 文件提交到版本控制
   - 定期更换加密密钥
   - 限制飞书应用权限范围

2. **访问控制**
   - 所有飞书API都需要用户认证
   - 用户只能访问自己的配置和数据

3. **数据备份**
   - 定期备份本地数据库
   - 飞书表格作为辅助存储，不替代本地数据

## 日志查看

### 应用日志

服务器控制台会输出详细的同步日志：

```
[SyncScheduler] Starting Feishu sync scheduler...
[SyncService] 开始飞书同步，用户ID: 1，同步类型: auto
[SyncService] 检测到本地变更 10 条
[SyncService] 推送到飞书：成功 10 条，失败 0 条
[SyncService] 同步完成，总耗时 2500ms
```

### 同步日志数据库

所有同步记录存储在 `feishu_sync_log` 表中，可通过API查询。

## 技术支持

如遇到问题，请提供以下信息：

1. 错误信息或现象描述
2. 同步日志（从同步历史中获取）
3. 系统版本和环境信息

## 更新日志

### v1.0.0 (2024-01-12)

- ✅ 实现双向同步功能
- ✅ 支持自动定时同步
- ✅ 冲突检测与处理
- ✅ 完整的日志记录
- ✅ API接口支持

## 未来计划

- [ ] 选择性同步（按标签、评分筛选）
- [ ] 实时同步（基于飞书事件订阅）
- [ ] 飞书端删除同步
- [ ] Web端配置界面
- [ ] 同步进度实时显示
- [ ] 多表格支持
