# 开发指南

本文档面向开发者，说明如何搭建开发环境、遵循代码规范以及进行调试。

## 目录

- [开发环境搭建](#开发环境搭建)
- [项���配置](#项目配置)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [测试指南](#测试指南)
- [发布流程](#发布流程)

---

## 开发环境搭建

### 环境要求

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 20.x | 20.19.6 LTS | 后端运行环境 |
| npm | 10.x | 最新版 | 包管理器 |
| IDE | - | VS Code | 推荐插件见下方 |

### VS Code 推荐插件

```json
{
  "recommendations": [
    "vue.volar",              // Vue 3 语言支持
    "vue.vscode-typescript-vue-plugin",  // Vue TypeScript 插件
    "dbaeumer.vscode-eslint", // ESLint 代码检查
    "esbenp.prettier-vscode", // Prettier 代码格式化
    "humao.rest-client",      // REST API 测试
    "mtxr.sqltools",          // SQLite 数据库工具
    "streetsidesoftware.code-spell-checker" // 拼写检查
  ]
}
```

### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/yourusername/second-brain.git
   cd second-brain
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**

   创建 `.env` 文件：

   ```bash
   # 复制示例配置
   cp .env.example .env

   # 编辑配置，填入你的 API Key
   notepad .env  # Windows
   nano .env      # Linux/Mac
   ```

4. **初始化数据库**

   ```bash
   npm run server
   # 数据库会自动初始化，包含默认用户
   ```

5. **启动开发服务**

   ```bash
   # Windows
   .\scripts\start.ps1

   # Linux/Mac
   ./scripts/start.sh
   ```

---

## 项目配置

### 环境变量说明

```bash
# ================================
# 基础配置
# ================================
PORT=3000                      # 后端服务端口
NODE_ENV=development           # 环境模式

# ================================
# AI 服务配置
# ================================
GOOGLE_API_KEY=your_key_here   # Google Generative AI Key
GEMINI_API_KEY=your_key_here   # 别名，优先级高于 GOOGLE_API_KEY

# ================================
# 认证配置
# ================================
DISABLE_ANON=false             # 是否禁用匿名访问
JWT_SECRET=your_secret         # JWT 签名密钥（生产环境必须修改）

# ================================
# 飞书同步配置
# ================================
FEISHU_SYNC_ENABLED=true       # 是否启用飞书同步
FEISHU_APP_ID=your_app_id      # 飞书应用 ID
FEISHU_APP_SECRET=your_secret  # 飞书应用密钥（会 AES 加密存储）
FEISHU_ENCRYPTION_KEY=16chars  # 加密密钥（16 字符）

# ================================
# 微信小程序配置（可选）
# ================================
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_secret
```

### Vite 配置

`vite.config.js` 关键配置：

```javascript
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,           // 前端开发服务器端口
    proxy: {
      '/api': {           // API 代理配置
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
```

---

## 代码规范

### JavaScript/Vue 规范

**命名规范：**

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `HomeView.vue`, `BackToTop.vue` |
| 文件名 | kebab-case | `user-guide.md`, `ai-service.js` |
| 变量/函数 | camelCase | `getUserInfo`, `contentList` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRY` |
| 类 | PascalCase | `DatabaseManager`, `SyncAdapter` |

**Vue 组件结构：**

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 1. 导入
import { ref, computed, onMounted } from 'vue';
import { useContentStore } from '@/stores/content';

// 2. Props 定义
const props = defineProps({
  contentId: {
    type: String,
    required: true
  }
});

// 3. Emits 定义
const emit = defineEmits(['update', 'delete']);

// 4. 响应式状态
const content = ref(null);
const loading = ref(false);

// 5. 计算属性
const displayTitle = computed(() => {
  return content.value?.title || '无标题';
});

// 6. 方法
const fetchContent = async () => {
  loading.value = true;
  // ...
};

// 7. 生命周期
onMounted(() => {
  fetchContent();
});
</script>

<style scoped>
/* 组件样式 */
</style>
```

### 后端代码规范

**路由文件结构：**

```javascript
// routes/contents.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/contents
 * 获取内容列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // 1. 参数验证
    const { page = 1, limit = 20, type, tag } = req.query;

    // 2. 业务逻辑
    const result = await getContents({ page, limit, type, tag });

    // 3. 响应
    res.json({
      success: true,
      data: result
    });

    logger.info(`Contents fetched: ${result.length} items`);
  } catch (error) {
    logger.error('Error fetching contents:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
```

**服务层规范：**

```javascript
// services/example-service.js
import { logger } from '../utils/logger.js';

/**
 * 服务函数应该：
 * 1. 接收明确定义的参数
 * 2. 处理业务逻辑
 * 3. 返回结构化结果
 * 4. 记录关键操作
 */
export async function processContent(content) {
  logger.info(`Processing content: ${content.id}`);

  try {
    // 业务逻辑
    const result = await doSomething(content);

    logger.info(`Content processed successfully: ${content.id}`);
    return { success: true, data: result };
  } catch (error) {
    logger.error(`Content processing failed: ${content.id}`, error);
    return { success: false, error: error.message };
  }
}
```

### 日志规范

使用 Winston 日志系统，而不是 `console.log`：

```javascript
import { logger } from '../utils/logger.js';

// 正确：使用 logger
logger.info('User logged in', { userId: user.id });
logger.warn('API rate limit approaching', { requests: 98 });
logger.error('Database connection failed', error);
logger.debug('Processing item', { itemId: 123 });

// 错误：避免使用 console.log
console.log('User logged in');  // 不要这样做
```

### Git 提交规范

使用约定式提交：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat(ai): 添加内容摘要生成 |
| fix | 修复 Bug | fix(auth): 修复 Token 过期问题 |
| docs | 文档变更 | docs: 更新 API 文档 |
| style | 代码格式 | style: 统一代码缩进 |
| refactor | 重构 | refactor(sync): 简化同步逻辑 |
| test | 添加测试 | test: 添加用户模块测试 |
| chore | 构建/工具 | chore: 更新依赖版本 |

**示例：**

```bash
git commit -m "feat(contents): 添加批量删除功能"
git commit -m "fix(sync): 修复飞书同步冲突问题"
git commit -m "docs: 更新开发环境配置说明"
```

---

## 调试技巧

### 前端调试

**1. Vue DevTools**

安装浏览器插件 Vue DevTools，可以：
- 查看组件树
- 检查 Pinia 状态
- 追踪事件
- 性能分析

**2. Console 调试**

```javascript
// 打印组件实例
console.log('Current component:', this);

// 打印 Store 状态
console.log('Content store:', import.meta.env.DEV ? useContentStore() : null);

// 分组打印
console.group('Content Data');
console.log('Title:', content.value.title);
console.log('Tags:', content.value.tags);
console.groupEnd();
```

**3. Network 调试**

```javascript
// 在 api.js 中添加请求拦截器
axios.interceptors.request.use(config => {
  console.log('API Request:', config.method?.toUpperCase(), config.url);
  return config;
});

axios.interceptors.response.use(response => {
  console.log('API Response:', response.status, response.data);
  return response;
});
```

### 后端调试

**1. VS Code 调试配置**

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动后端服务",
      "program": "${workspaceFolder}/server/index.js",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**2. 日志调试**

```javascript
import { logger } from './utils/logger.js';

// 开发环境使用 DEBUG 级别
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

// 打印详细调试信息
logger.debug('Request details:', {
  method: req.method,
  url: req.url,
  query: req.query,
  body: req.body
});
```

**3. 数据库调试**

使用提供的数据库检查工具：

```bash
# 查看数据库表结构
node inspect_db.js

# 查询内容统计
node inspect_db.js --stats
```

### API 测试

**1. 使用 REST Client 插件**

创建 `tests/requests.http`：

```http
### 获取内容列表
GET http://localhost:3000/api/contents?page=1&limit=10
Authorization: Bearer your_token_here

### 创建内容
POST http://localhost:3000/api/contents
Content-Type: application/json
Authorization: Bearer your_token_here

{
  "type": "随笔",
  "title": "测试标题",
  "content": "测试内容"
}

### AI 分析
POST http://localhost:3000/api/contents/analyze
Content-Type: application/json

{
  "content": "这是一段需要分析的内容"
}
```

**2. 使用 cURL**

```bash
# 获取内容列表
curl -X GET "http://localhost:3000/api/contents" \
  -H "Authorization: Bearer your_token"

# 创建内容
curl -X POST "http://localhost:3000/api/contents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{"type":"随笔","title":"测试","content":"内容"}'
```

---

## 测试指南

### 手动测试清单

**内容管理：**
- [ ] 创建内容（各种类型）
- [ ] 编辑内容
- [ ] 删除内容
- [ ] 收藏/取消收藏
- [ ] 搜索内容
- [ ] 筛选内容（按类型、标签）

**AI 功能：**
- [ ] AI 分析内容
- [ ] 每日总结生成
- [ ] AI 模型降级

**飞书同步：**
- [ ] 配置飞书
- [ ] 手动同步
- [ ] 定时同步
- [ ] 冲突处理

**认证：**
- [ ] 用户登录
- [ ] Token 刷新
- [ ] 权限验证

### 数据库测试

```bash
# 1. 备份现有数据
copy data\brain.db data\brain.db.backup

# 2. 重置数据库
del data\brain.db

# 3. 重启服务（会自动创建新数据库）
npm run server

# 4. 测试完成后恢复
copy data\brain.db.backup data\brain.db
```

---

## 常见开发问题

### 端口被占用

**Windows:**
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程
taskkill /PID <进程ID> /F
```

**Linux/Mac:**
```bash
# 查找占用端口的进程
lsof -i :3000

# 结束进程
kill -9 <进程ID>
```

### 依赖问题

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 数据库锁定

```bash
# SQLite 可能会因为进程未正常退出而锁定文件
# 确保没有其他 node 进程在运行
tasklist | findstr node  # Windows
ps aux | grep node       # Linux/Mac

# 如果仍有问题，删除锁文件
del data\brain.db-shm    # Windows
rm data/brain.db-shm     # Linux/Mac
del data\brain.db-wal    # Windows
rm data/brain.db-wal     # Linux/Mac
```

---

## 发布流程

### 版本号规范

遵循语义化版本（SemVer）：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的 Bug 修复

### 发布步骤

1. **更新版本号**

   ```bash
   npm version patch  # 或 minor / major
   ```

2. **构建生产版本**

   ```bash
   npm run build
   ```

3. **测试生产版本**

   ```bash
   npm run preview
   ```

4. **提交代码**

   ```bash
   git add .
   git commit -m "chore: release v1.x.x"
   git tag v1.x.x
   git push origin main --tags
   ```

### 部署检查清单

- [ ] 更新环境变量
- [ ] 数据库备份
- [ ] 日志目录权限
- [ ] API Key 配置
- [ ] 飞书配置（如使用）
- [ ] 监控配置

---

## 资源链接

- [Vue 3 文档](https://cn.vuejs.org/)
- [Express 文档](https://expressjs.com/)
- [Pinia 文档](https://pinia.vuejs.org/zh/)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [Google AI 文档](https://ai.google.dev/docs)

---

**文档版本:** 1.0.0
**最后更新:** 2024-01-18
