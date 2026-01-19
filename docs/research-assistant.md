# 研究助手功能实现总结

## 已完成的工作

### 1. 数据库设计 ✅
在 `server/models/database.js` 中创建了以下表：

- **research_projects**: 研究项目表
  - 字段：id, user_id, title, description, status, created_at, updated_at
  - 状态：draft, analyzing, researching, done

- **research_questions**: 研究问题表
  - 字段：id, project_id, question, answer, status, order_index, created_at
  - 用于存储AI生成的研究问题和用户的回答

- **research_materials**: 研究资料表
  - 字段：id, project_id, question_id, type, source, title, content, relevance_score, created_at
  - 存储收集到的本地内容和网络资源

- **research_connections**: 知识关联表
  - 字段：id, project_id, material_id, connected_material_id, connection_type, strength, created_at
  - 存储资料之间的关联关系（相似、引用、互补）

### 2. 后端服务层 ✅

#### `server/services/research-service.js`
实现了核心AI功能：

- **analyzeRequirements()**: 需求分析，生成研究问题
- **clarifyRequirement()**: 继续需求分析，根据用户回答生成后续问题
- **searchLocalMaterials()**: 搜索本地内容库
- **assessRelevance()**: 评估资料与研究主题的相关性
- **extractTopics()**: 从资料中提取核心主题
- **findConnections()**: 发现资料之间的关联关系
- **generateReport()**: 生成研究报告

#### `server/routes/research.js`
实现了完整的REST API：

- `GET /api/research/projects` - 获取项目列表
- `GET /api/research/projects/:id` - 获取项目详情
- `POST /api/research/projects` - 创建项目
- `PUT /api/research/projects/:id` - 更新项目
- `DELETE /api/research/projects/:id` - 删除项目
- `POST /api/research/projects/:id/analyze-requirements` - 开始需求分析
- `POST /api/research/projects/:id/questions` - 回答问题
- `POST /api/research/projects/:id/collect-materials` - 收集资料
- `POST /api/research/projects/:id/process-materials` - 处理资料
- `GET /api/research/projects/:id/knowledge-graph` - 获取知识图谱
- `POST /api/research/projects/:id/generate-report` - 生成报告
- `GET /api/research/projects/:id/materials` - 获取资料列表

### 3. 前端实现 ✅

#### `src/stores/research.js`
Pinia状态管理，包含所有研究相关的状态和操作。

#### `src/views/ResearchListView.vue`
研究项目列表页面：
- 项目卡片展示（标题、描述、状态、统计信息）
- 状态筛选（草稿、分析中、研究中、已完成）
- 创建/编辑项目对话框
- 删除项目功能

#### `src/views/ResearchDialogueView.vue`
研究对话界面（核心功能页面）：
- 对话式交互界面
- 显示研究问题和用户回答
- 操作提示卡片（引导用户完成各个阶段）
- 资料面板（显示收集到的资料）
- 知识图谱面板
- 报告生成和预览

#### `src/components/KnowledgeGraph.vue`
知识图谱可视化组件：
- SVG绘制节点和边
- 力导向布局算法
- 节点拖拽功能
- 节点信息悬浮显示
- 缩放和重置控制
- 图例说明

### 4. 路由配置 ✅
在 `src/router/index.js` 中添加了：
- `/research` - 研究项目列表
- `/research/:id` - 研究对话界面

### 5. 主页入口 ✅
在 `src/views/HomeView.vue` 中添加了"🔬 研究助手"按钮。

## 功能流程

### 完整的研究流程：

1. **创建项目** → 用户输入研究主题和目标
2. **需求分析** → AI生成3-5个研究问题
3. **回答问题** → 用户逐个回答问题，AI可能生成后续问题
4. **收集资料** → 从本地内容库搜索相关资料
5. **分析资料** → AI分析资料之间的关联关系
6. **生成报告** → AI生成结构化的研究报告

## 技术特点

1. **AI驱动**: 使用Google Generative AI (Gemini)进行智能分析
2. **对话式交互**: 类似ChatGPT的对话界面
3. **知识图谱**: 可视化展示资料之间的关联
4. **相关性评分**: 自动评估资料与研究主题的相关度
5. **多模型fallback**: 支持多个AI模型自动切换
6. **响应式设计**: 适配不同屏幕尺寸

## 使用说明

### 启动项目

```bash
# 安装依赖（如果还没安装）
npm install

# 启动后端服务器
npm run server

# 启动前端开发服务器（新终端）
npm run dev
```

### 使用流程

1. 登录后，点击右上角"🔬 研究助手"按钮
2. 点击"+ 新建研究项目"
3. 输入研究主题（如"Vue 3 组件设计最佳实践"）
4. 点击"开始需求分析"，AI会生成研究问题
5. 逐个回答问题
6. 点击"开始收集资料"，系统会从本地内容库搜索相关资料
7. 点击"开始分析资料"，AI会分析资料之间的关联
8. 点击"生成报告"，获得完整的研究报告

## 注意事项

1. **API Key**: 需要配置 `GOOGLE_API_KEY` 或 `GEMINI_API_KEY` 环境变量
2. **本地内容**: 资料收集功能依赖于已有的本地内容库
3. **AI配额**: 频繁使用可能触发API配额限制，代码已实现自动重试和模型切换
4. **数据库迁移**: 首次启动会自动创建新表

## 后续优化建议

1. **网络搜索**: 添加网络资源搜索功能（目前只支持本地搜索）
2. **文件上传**: 支持上传PDF、Word等文件作为研究资料
3. **导出功能**: 支持导出研究报告为PDF或Word
4. **协作功能**: 支持多人协作研究
5. **模板系统**: 提供不同类型的研究模板
6. **进度保存**: 自动保存研究进度，支持断点续传
7. **引用管理**: 自动生成参考文献格式

## 文件清单

### 后端
- `server/models/database.js` - 数据库表定义（已修改）
- `server/services/research-service.js` - 研究服务层（新建）
- `server/routes/research.js` - 研究API路由（新建）
- `server/index.js` - 注册研究路由（已修改）

### 前端
- `src/stores/research.js` - 研究状态管理（新建）
- `src/views/ResearchListView.vue` - 项目列表页面（新建）
- `src/views/ResearchDialogueView.vue` - 对话界面（新建）
- `src/components/KnowledgeGraph.vue` - 知识图谱组件（新建）
- `src/router/index.js` - 路由配置（已修改）
- `src/views/HomeView.vue` - 主页入口（已修改）

## 总结

研究助手功能已经完整实现，包括：
- ✅ 完整的数据库设计
- ✅ AI驱动的需求分析和内容处理
- ✅ 对话式交互界面
- ✅ 知识图谱可视化
- ✅ 研究报告生成
- ✅ 与现有系统的集成

所有核心功能都已实现，可以开始测试和使用。
