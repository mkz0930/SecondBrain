# 研究助手 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api/research`
- **认证**: 需要用户登录（通过session token）
- **Content-Type**: `application/json`

## API 端点

### 1. 项目管理

#### 1.1 获取项目列表

```http
GET /api/research/projects
```

**查询参数**:
- `status` (可选): 项目状态 (draft, analyzing, researching, done)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Vue 3 组件设计最佳实践",
      "description": "研究 Vue 3 组件设计模式",
      "status": "analyzing",
      "created_at": "2024-01-01 10:00:00",
      "updated_at": "2024-01-01 11:00:00",
      "stats": {
        "question_count": 5,
        "material_count": 12
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

#### 1.2 获取项目详情

```http
GET /api/research/projects/:id
```

**响应示例**:
```json
{
  "id": 1,
  "user_id": 1,
  "title": "Vue 3 组件设计最佳实践",
  "description": "研究 Vue 3 组件设计模式",
  "status": "analyzing",
  "created_at": "2024-01-01 10:00:00",
  "updated_at": "2024-01-01 11:00:00",
  "questions": [
    {
      "id": 1,
      "project_id": 1,
      "question": "你想重点研究哪些方面？",
      "answer": "组合式API和性能优化",
      "status": "answered",
      "order_index": 1,
      "created_at": "2024-01-01 10:05:00"
    }
  ],
  "materials": [
    {
      "id": 1,
      "project_id": 1,
      "type": "local",
      "source": "本地内容 #123",
      "title": "Vue 3 Composition API 详解",
      "content": "...",
      "relevance_score": 0.85,
      "created_at": "2024-01-01 10:30:00"
    }
  ]
}
```

#### 1.3 创建项目

```http
POST /api/research/projects
```

**请求体**:
```json
{
  "title": "Vue 3 组件设计最佳实践",
  "description": "研究 Vue 3 组件设计模式"
}
```

**响应示例**:
```json
{
  "id": 1,
  "message": "Project created successfully"
}
```

#### 1.4 更新项目

```http
PUT /api/research/projects/:id
```

**请求体**:
```json
{
  "title": "新标题",
  "description": "新描述",
  "status": "researching"
}
```

**响应示例**:
```json
{
  "message": "Project updated successfully"
}
```

#### 1.5 删除项目

```http
DELETE /api/research/projects/:id
```

**响应示例**:
```json
{
  "message": "Project deleted successfully"
}
```

### 2. 需求分析

#### 2.1 开始需求分析

```http
POST /api/research/projects/:id/analyze-requirements
```

**响应示例**:
```json
{
  "questions": [
    {
      "question": "你想重点研究哪些方面？",
      "order": 1
    },
    {
      "question": "你的目标是什么？",
      "order": 2
    }
  ],
  "searchQueries": [
    "Vue 3 组件设计",
    "Composition API",
    "性能优化"
  ]
}
```

#### 2.2 回答问题

```http
POST /api/research/projects/:id/questions
```

**请求体**:
```json
{
  "questionId": 1,
  "answer": "我想重点研究组合式API和性能优化"
}
```

**响应示例**:
```json
{
  "needMoreInfo": true,
  "newQuestions": [
    {
      "question": "你对组合式API的了解程度如何？"
    }
  ]
}
```

### 3. 资料收集

#### 3.1 收集资料

```http
POST /api/research/projects/:id/collect-materials
```

**请求体**:
```json
{
  "scope": "local"  // local, network, all
}
```

**响应示例**:
```json
{
  "message": "Materials collected successfully",
  "count": 15
}
```

#### 3.2 获取资料列表

```http
GET /api/research/projects/:id/materials
```

**查询参数**:
- `type` (可选): 资料类型 (local, network, file)
- `page` (可选): 页码
- `limit` (可选): 每页数量

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "project_id": 1,
      "type": "local",
      "source": "本地内容 #123",
      "title": "Vue 3 Composition API 详解",
      "content": "...",
      "relevance_score": 0.85,
      "created_at": "2024-01-01 10:30:00"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### 4. 资料处理

#### 4.1 处理资料

```http
POST /api/research/projects/:id/process-materials
```

**响应示例**:
```json
{
  "message": "Materials processed successfully",
  "connectionsCount": 8
}
```

#### 4.2 获取知识图谱

```http
GET /api/research/projects/:id/knowledge-graph
```

**响应示例**:
```json
{
  "nodes": [
    {
      "id": 1,
      "label": "Vue 3 Composition API 详解",
      "type": "local",
      "relevance": 0.85,
      "content": "..."
    }
  ],
  "edges": [
    {
      "from": 1,
      "to": 2,
      "type": "similarity",
      "strength": 0.75
    }
  ]
}
```

### 5. 报告生成

#### 5.1 生成研究报告

```http
POST /api/research/projects/:id/generate-report
```

**响应示例**:
```json
{
  "report": "# 研究报告\n\n## 研究概述\n\n..."
}
```

## 错误响应

所有API在出错时返回统一格式：

```json
{
  "error": "错误信息"
}
```

**常见错误码**:
- `400`: 请求参数错误
- `401`: 未认证
- `404`: 资源不存在
- `500`: 服务器内部错误
- `503`: AI服务不可用

## 状态码说明

- `200`: 成功
- `201`: 创建成功
- `400`: 请求错误
- `401`: 未授权
- `404`: 未找到
- `500`: 服务器错误
- `503`: 服务不可用

## 项目状态流转

```
draft (草稿)
  ↓ analyze-requirements
analyzing (分析中)
  ↓ collect-materials
researching (研究中)
  ↓ process-materials
analyzing (分析中)
  ↓ generate-report
done (已完成)
```

## 使用示例

### 完整流程示例 (使用 curl)

```bash
# 1. 创建项目
curl -X POST http://localhost:3000/api/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vue 3 组件设计最佳实践",
    "description": "研究 Vue 3 组件设计模式"
  }'

# 2. 开始需求分析
curl -X POST http://localhost:3000/api/research/projects/1/analyze-requirements

# 3. 回答问题
curl -X POST http://localhost:3000/api/research/projects/1/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": 1,
    "answer": "我想重点研究组合式API和性能优化"
  }'

# 4. 收集资料
curl -X POST http://localhost:3000/api/research/projects/1/collect-materials \
  -H "Content-Type: application/json" \
  -d '{"scope": "local"}'

# 5. 处理资料
curl -X POST http://localhost:3000/api/research/projects/1/process-materials

# 6. 获取知识图谱
curl http://localhost:3000/api/research/projects/1/knowledge-graph

# 7. 生成报告
curl -X POST http://localhost:3000/api/research/projects/1/generate-report
```

### JavaScript 示例

```javascript
// 使用 axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/research'
});

// 创建项目
const createProject = async () => {
  const response = await api.post('/projects', {
    title: 'Vue 3 组件设计最佳实践',
    description: '研究 Vue 3 组件设计模式'
  });
  return response.data;
};

// 开始需求分析
const analyzeRequirements = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/analyze-requirements`);
  return response.data;
};

// 回答问题
const answerQuestion = async (projectId, questionId, answer) => {
  const response = await api.post(`/projects/${projectId}/questions`, {
    questionId,
    answer
  });
  return response.data;
};

// 收集资料
const collectMaterials = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/collect-materials`, {
    scope: 'local'
  });
  return response.data;
};

// 生成报告
const generateReport = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/generate-report`);
  return response.data;
};
```

## 注意事项

1. **认证**: 所有API都需要用户认证，确保请求中包含有效的session token
2. **速率限制**: AI相关操作可能受到API配额限制
3. **超时**: 某些操作（如需求分析、报告生成）可能需要较长时间
4. **并发**: 避免对同一项目同时发起多个AI操作
5. **数据大小**: 资料内容可能较大，注意分页获取

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- 实现基础的研究助手功能
- 支持本地资料搜索
- 支持知识图谱可视化
- 支持研究报告生成
