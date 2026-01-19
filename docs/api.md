# API 文档

Second Brain REST API 接口文档。

## 目录

- [概述](#概述)
- [认证](#认证)
- [内容管理](#内容管理)
- [标签管理](#标签管理)
- [统计信息](#统计信息)
- [每日总结](#每日总结)
- [飞书同步](#飞书同步)
- [错误码](#错误码)

---

## 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `http://localhost:3000/api` |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 认证方式 | Bearer Token (JWT) |

### 通用响应格式

**成功响应：**

```json
{
  "success": true,
  "data": { /* 响应数据 */ }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

### 分页格式

```json
{
  "success": true,
  "data": {
    "items": [ /* 数据列表 */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## 认证

### 登录

```
POST /api/auth/login
```

**请求体：**

```json
{
  "username": "string",
  "password": "string"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "user",
      "openid": "optional_openid"
    }
  }
}
```

### 注册

```
POST /api/auth/register
```

**请求体：**

```json
{
  "username": "string",
  "password": "string"
}
```

**响应：** 同登录

### 获取当前用户

```
GET /api/auth/me
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
    "id": 1,
    "username": "user"
  }
}
```

---

## 内容管理

### 获取内容列表

```
GET /api/contents
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
| type | string | 否 | 内容类型筛选 |
| tag | string | 否 | 标签筛选 |
| isFavorite | boolean | 否 | 是否只看收藏 |
| search | string | 否 | 搜索关键词 |
| sortBy | string | 否 | 排序字段（createdAt, updatedAt, rating） |
| sortOrder | string | 否 | 排序方向（asc, desc） |

**示例请求：**

```
GET /api/contents?page=1&limit=20&type=随笔&isFavorite=true&search=关键词
```

**响应：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "type": "随笔",
        "title": "今天学习了 Vue 3",
        "content": "Vue 3 的 Composition API 很强大...",
        "summary": "学习 Vue 3 Composition API 的笔记",
        "source": "https://example.com",
        "rating": 4.5,
        "isFavorite": true,
        "accessCount": 10,
        "createdAt": "2024-01-18T10:00:00.000Z",
        "updatedAt": "2024-01-18T10:00:00.000Z",
        "tags": [
          { "id": 1, "name": "前端", "color": "#3B82F6" }
        ]
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

### 获取内容详情

```
GET /api/contents/:id
```

**请求头：**

```
Authorization: Bearer {token}
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 内容 ID |

**响应：**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "随笔",
    "title": "今天学习了 Vue 3",
    "content": "Vue 3 的 Composition API 很强大...",
    "summary": "学习 Vue 3 Composition API 的笔记",
    "source": "https://example.com",
    "rating": 4.5,
    "isFavorite": true,
    "accessCount": 10,
    "createdAt": "2024-01-18T10:00:00.000Z",
    "updatedAt": "2024-01-18T10:00:00.000Z",
    "tags": [
      { "id": 1, "name": "前端", "color": "#3B82F6" }
    ]
  }
}
```

### 创建内容

```
POST /api/contents
```

**请求头：**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**

```json
{
  "type": "随笔",
  "title": "标题（可选）",
  "content": "内容正文",
  "source": "https://example.com（可选）",
  "rating": 5,
  "isFavorite": false,
  "tagIds": [1, 2]
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "type": "随笔",
    "title": "AI 提取的标题",
    "content": "AI 优化后的内容",
    "summary": "AI 生成的摘要",
    "tags": [...],
    ...
  }
}
```

**注意：** 创建时会自动触发 AI 分析，返回的内容可能经过 AI 处理。

### 更新内容

```
PUT /api/contents/:id
```

**请求头：**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 内容 ID |

**请求体：** 同创建内容

**响应：** 同获取内容详情

### 删除内容

```
DELETE /api/contents/:id
```

**请求头：**

```
Authorization: Bearer {token}
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 内容 ID |

**响应：**

```json
{
  "success": true,
  "message": "内容已删除"
}
```

**注意：** 这是软删除，数据仍保留在数据库中。

### 切换收藏状态

```
POST /api/contents/:id/favorite
```

**请求头：**

```
Authorization: Bearer {token}
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 内容 ID |

**响应：**

```json
{
  "success": true,
  "data": {
    "isFavorite": true
  }
}
```

### 记录访问

```
POST /api/contents/:id/access
```

**请求头：**

```
Authorization: Bearer {token}
```

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 内容 ID |

**响应：**

```json
{
  "success": true,
  "data": {
    "accessCount": 11
  }
}
```

### AI 分析内容

```
POST /api/contents/analyze
```

**请求头：**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**

```json
{
  "content": "需要分析的内容正文"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "title": "提取的标题",
    "summary": "生成的摘要",
    "type": "识别的类型",
    "tags": ["推荐标签1", "推荐标签2"],
    "formattedContent": "优化格式后的内容"
  }
}
```

---

## 标签管理

### 获取标签列表

```
GET /api/tags
```

**请求头：**

```
Authorization: Bearer {token}
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "前端",
      "color": "#3B82F6",
      "count": 25
    },
    {
      "id": 2,
      "name": "后端",
      "color": "#10B981",
      "count": 15
    }
  ]
}
```

### 创建标签

```
POST /api/tags
```

**请求头：**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**

```json
{
  "name": "标签名称",
  "color": "#3B82F6"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "标签名称",
    "color": "#3B82F6"
  }
}
```

---

## 统计信息

### 获取统计数据

```
GET /api/stats
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
    "totalContents": 150,
    "totalTags": 25,
    "totalFavorites": 30,
    "typeDistribution": {
      "随笔": 80,
      "文章": 40,
      "音视频": 20,
      "书籍": 10
    },
    "recentActivity": [
      {
        "date": "2024-01-18",
        "count": 5
      }
    ]
  }
}
```

---

## 每日总结

### 获取每日总结

```
GET /api/daily-summary
```

**请求头：**

```
Authorization: Bearer {token}
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 否 | 日期，格式 YYYY-MM-DD，默认今天 |

**示例请求：**

```
GET /api/daily-summary?date=2024-01-18
```

**响应：**

```json
{
  "success": true,
  "data": {
    "date": "2024-01-18",
    "summary": "今天你记录了 5 篇内容，其中 2 篇文章，3 篇随笔...",
    "contents": [
      {
        "id": 1,
        "type": "随笔",
        "title": "Vue 3 学习笔记",
        "summary": "..."
      }
    ]
  }
}
```

### 生成每日总结

```
POST /api/daily-summary/generate
```

**请求头：**

```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体：**

```json
{
  "date": "2024-01-18"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "date": "2024-01-18",
    "summary": "AI 生成的总结内容...",
    "contents": [...]
  }
}
```

---

## 飞书同步

### 获取飞书配置

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
    "hasSecret": true
  }
}
```

**注意：** 出于安全考虑，AppSecret 不会返回。

### 保存飞书配置

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
  "appSecret": "xxxxxxxxxxxx"
}
```

**响应：**

```json
{
  "success": true,
  "message": "配置已保存"
}
```

### 手动同步

```
POST /api/feishu/sync
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
    "status": "completed",
    "added": 5,
    "updated": 10,
    "deleted": 2,
    "errors": 0
  }
}
```

### 获取同步日志

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
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |

**响应：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "status": "success",
        "message": "同步完成",
        "details": {
          "added": 5,
          "updated": 10
        },
        "createdAt": "2024-01-18T10:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

### 重置并拉取

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

**注意：** 此操作会清空本地内容，从飞书全量拉取，请谨慎使用。

---

## 错误码

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| INVALID_PARAMS | 参数验证失败 |
| INVALID_TOKEN | Token 无效 |
| EXPIRED_TOKEN | Token 已过期 |
| USER_NOT_FOUND | 用户不存在 |
| INVALID_CREDENTIALS | 用户名或密码错误 |
| CONTENT_NOT_FOUND | 内容不存在 |
| TAG_NOT_FOUND | 标签不存在 |
| AI_ERROR | AI 服务错误 |
| SYNC_ERROR | 同步失败 |
| FEISHU_CONFIG_ERROR | 飞书配置错误 |

---

## 使用示例

### JavaScript (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 获取内容列表
const { data } = await api.get('/contents', {
  params: { page: 1, limit: 20 }
});

// 创建内容
const { data } = await api.post('/contents', {
  type: '随笔',
  content: '今天学习了 Vue 3'
});
```

### cURL

```bash
# 获取内容列表
curl -X GET "http://localhost:3000/api/contents" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建内容
curl -X POST "http://localhost:3000/api/contents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"随笔","content":"测试内容"}'

# AI 分析
curl -X POST "http://localhost:3000/api/contents/analyze" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"需要分析的内容"}'
```

---

**文档版本:** 1.0.0
**最后更新:** 2024-01-18
