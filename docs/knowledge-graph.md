# 知识图谱功能文档

## 概述

知识图谱是 Second Brain 的核心可视化功能,通过图形化方式展示内容之间的关联关系,帮助用户发现知识之间的隐藏联系。

## 功能特性

### 1. 节点类型

- **内容节点**: 显示用户记录的所有内容(随笔、文章、音视频、书籍等)
  - 节点大小根据重要性动态调整(收藏、评分、标签数量)
  - 不同内容类型使用不同颜色标识
  - 支持点击查看详情、双击跳转到内容页面

- **标签节点**: 显示所有标签
  - 节点大小根据关联内容数量调整
  - 使用标签自定义颜色

### 2. 关联关系

#### 2.1 内容-标签关联 (实线)
- 显示内容与标签的直接关联关系
- 灰色实线连接

#### 2.2 内容-内容关联 (虚线)
基于**标签共现**算法:
- 计算两个内容之间的共同标签数量
- 共同标签数 ≥ 1 时建立连接
- 线条粗细表示共同标签数量(1-5个)
- 蓝色虚线,透明度60%

#### 2.3 内容-内容关联 (点线)
基于**关键词相似度**算法:
- 使用 Jaccard 相似度计算关键词重合度
- 相似度 ≥ 0.3 时建立连接
- 线条粗细表示相似度(0.3-1.0)
- 绿色点线,透明度50%

### 3. 交互功能

#### 3.1 图谱操作
- **拖拽**: 拖动节点调整位置
- **缩放**: 鼠标滚轮缩放图谱
- **平移**: 拖动空白区域平移视图
- **点击节点**: 显示节点详情面板
- **双击节点**: 跳转到内容详情页
- **悬停**: 显示节点信息提示

#### 3.2 筛选功能
- **内容类型筛选**: 按随笔、文章、音视频、书籍等类型筛选
- **标签筛选**: 按标签筛选内容
- **最小连接数**: 过滤连接数较少的节点
- **重置筛选**: 一键恢复默认视图

#### 3.3 详情面板
- 显示节点基本信息(类型、来源、评分、创建时间等)
- 显示相关节点推荐(基于共同标签/内容)
- 支持点击相关节点快速跳转

### 4. 可视化特性

- **力导向布局**: 自动计算节点位置,相关节点自动聚集
- **节点高亮**: 点击节点时高亮显示相邻节点和连线
- **标签隐藏**: 自动隐藏重叠标签,保持界面清晰
- **主题适配**: 自动适配深色/浅色主题
- **响应式设计**: 适配不同屏幕尺寸

## 技术架构

### 后端架构

#### 1. 服务层 (`server/services/graph-service.js`)

核心类: `GraphService`

**主要方法**:
- `getGraphData(userId, options)`: 获取完整图谱数据
- `getContentNodes(userId, filters)`: 获取内容节点
- `getTagNodes(userId, tagIds)`: 获取标签节点
- `getContentTagEdges(userId, filters)`: 获取内容-标签边
- `getContentContentEdges(contents, minConnections)`: 获取内容-内容边(标签共现)
- `getKeywordBasedEdges(contents)`: 获取内容-内容边(关键词相似度)
- `getNodeDetail(userId, nodeId)`: 获取节点详情
- `getRelatedNodes(userId, nodeId, limit)`: 获取相关节点推荐

**关键算法**:

1. **标签共现算法**:
```javascript
// 计算两个内容之间的共同标签
const commonTags = new Set([...tags1].filter(t => tags2.has(t)))
if (commonTags.size >= minConnections) {
  // 建立连接
}
```

2. **关键词相似度算法** (Jaccard相似度):
```javascript
// 提取关键词(前20个高频词)
const keywords = extractKeywords(title, content, summary)

// 计算Jaccard相似度
const intersection = new Set([...set1].filter(k => set2.has(k)))
const union = new Set([...set1, ...set2])
const similarity = intersection.size / union.size
```

#### 2. API 路由 (`server/routes/graph.js`)

**端点**:
- `GET /api/graph/data`: 获取图谱数据
  - Query: `contentTypes`, `tagIds`, `startDate`, `endDate`, `minConnections`
  - Response: `{ nodes, edges, categories, stats }`

- `GET /api/graph/node/:nodeId`: 获取节点详情
  - Response: 内容或标签的详细信息

- `GET /api/graph/related/:nodeId`: 获取相关节点
  - Query: `limit` (默认10)
  - Response: 相关节点列表

- `GET /api/graph/stats`: 获取图谱统计
  - Response: `{ totalNodes, totalEdges, contentCount, tagCount, avgConnections }`

### 前端架构

#### 1. 状态管理 (`src/stores/graph.js`)

**Pinia Store**: `useGraphStore`

**状态**:
- `graphData`: 图谱数据 `{ nodes, edges, categories, stats }`
- `loading`: 加载状态
- `error`: 错误信息
- `selectedNode`: 当前选中节点
- `nodeDetail`: 节点详情
- `relatedNodes`: 相关节点列表
- `filters`: 筛选器配置

**方法**:
- `fetchGraphData(options)`: 获取图谱数据
- `fetchNodeDetail(nodeId)`: 获取节点详情
- `fetchRelatedNodes(nodeId, limit)`: 获取相关节点
- `updateFilters(newFilters)`: 更新筛选器
- `selectNode(node)`: 选择节点
- `refresh()`: 刷新图谱

#### 2. 主页面组件 (`src/views/KnowledgeGraphView.vue`)

**功能**:
- 顶部工具栏(标题、统计、筛选器、操作按钮)
- 图表容器(显示图谱可视化)
- 侧边详情面板(显示节点详情和相关节点)

**交互流程**:
1. 用户打开知识图谱页面
2. 自动加载图谱数据
3. 用户可以通过筛选器过滤数据
4. 点击节点查看详情
5. 双击节点跳转到内容页面

#### 3. 图表组件 (`src/components/GraphVisualization.vue`)

**技术栈**: ECharts + vue-echarts

**配置**:
- 图表类型: `graph` (关系图)
- 布局算法: `force` (力导向布局)
- 力导向参数:
  - `repulsion`: 200 (节点斥力)
  - `gravity`: 0.1 (重力)
  - `edgeLength`: [50, 150] (边长范围)

**事件**:
- `click`: 节点点击事件
- `dblclick`: 节点双击事件

## 数据格式

### 节点格式

```javascript
{
  id: 'content-123' | 'tag-456',
  name: '节点名称',
  type: 'content' | 'tag',
  category: 0-9, // 分类索引
  value: 3, // 节点权重(影响大小)
  symbolSize: 30-80, // 节点大小
  itemStyle: {
    color: '#3B82F6' // 节点颜色
  },
  data: {
    // 节点元数据
    id: 123,
    type: '文章',
    rating: 5,
    tag_count: 3,
    // ...
  }
}
```

### 边格式

```javascript
{
  source: 'content-123',
  target: 'tag-456' | 'content-789',
  type: 'content-tag' | 'content-content-tag' | 'content-content-keyword',
  value: 3, // 边权重(共同标签数/相似度)
  lineStyle: {
    color: '#94A3B8',
    width: 1-5,
    type: 'solid' | 'dashed' | 'dotted',
    opacity: 0.5-1.0
  },
  label: {
    show: true,
    formatter: '3个共同标签'
  }
}
```

## 性能优化

### 1. 数据层优化
- 使用 SQL 索引加速查询
- 批量查询减少数据库往返
- 缓存计算结果(关键词提取、相似度计算)

### 2. 渲染层优化
- ECharts 按需加载组件
- 力导向布局动画优化
- 标签自动隐藏避免重叠
- 响应式图表自动调整大小

### 3. 交互优化
- 节点高亮聚焦相邻节点
- 详情面板懒加载
- 筛选器防抖处理

## 使用指南

### 1. 访问知识图谱

在首页点击顶部导航栏的 **"🕸️ 知识图谱"** 按钮,或直接访问 `/graph` 路由。

### 2. 筛选内容

使用顶部工具栏的筛选器:
- **内容类型**: 多选下拉框,选择要显示的内容类型
- **标签**: 多选下拉框,选择要筛选的标签
- **最小连接数**: 输入数字,过滤连接数较少的节点

点击 **"重置筛选"** 按钮恢复默认视图。

### 3. 查看节点详情

- **点击节点**: 右侧弹出详情面板,显示节点信息和相关节点
- **双击节点**: 跳转到内容详情页面(仅内容节点)
- **悬停节点**: 显示节点信息提示框

### 4. 操作图谱

- **拖动节点**: 调整节点位置
- **拖动空白**: 平移整个图谱
- **鼠标滚轮**: 缩放图谱
- **工具栏**: 使用 ECharts 工具栏重置视图或保存图片

### 5. 发现关联

- **蓝色虚线**: 表示两个内容有共同标签
- **绿色点线**: 表示两个内容有相似关键词
- **灰色实线**: 表示内容与标签的关联

线条越粗,关联度越高。

## 扩展功能(未来计划)

### 1. 语义关联 (AI Embedding)
- 使用 AI 模型生成内容向量
- 计算向量相似度建立语义关联
- 更准确地发现内容之间的深层联系

### 2. 路径分析
- 查找两个节点之间的最短路径
- 发现知识传播路径
- 可视化知识演化过程

### 3. 社区检测
- 自动识别知识聚类
- 发现主题社区
- 推荐相关主题

### 4. 时间轴视图
- 按时间线展示知识图谱演化
- 动画播放知识增长过程
- 分析知识积累趋势

### 5. 导出功能
- 导出图谱为图片(PNG/SVG)
- 导出图谱数据(JSON/CSV)
- 生成知识图谱报告

## 故障排查

### 1. 图谱无法加载

**问题**: 页面显示"暂无数据"

**解决方案**:
- 检查是否有内容和标签数据
- 检查后端服务是否正常运行
- 查看浏览器控制台错误信息
- 检查 API 端点是否可访问: `http://localhost:3000/api/graph/stats`

### 2. 节点显示异常

**问题**: 节点大小或颜色不正确

**解决方案**:
- 检查内容类型是否正确
- 检查标签颜色配置
- 刷新页面重新加载数据

### 3. 性能问题

**问题**: 图谱加载缓慢或卡顿

**解决方案**:
- 使用筛选器减少节点数量
- 增加最小连接数过滤孤立节点
- 检查数据库索引是否正常
- 考虑升级硬件配置

### 4. 关联关系缺失

**问题**: 应该有关联的内容没有连线

**解决方案**:
- 检查内容是否有共同标签
- 降低相似度阈值(修改 `graph-service.js` 中的 `0.3`)
- 检查关键词提取是否正常
- 手动添加标签增强关联

## 技术依赖

- **后端**: Node.js, Express, SQLite
- **前端**: Vue 3, Pinia, Vue Router
- **可视化**: ECharts 5.x, vue-echarts
- **算法**: Jaccard相似度, 力导向布局

## 相关文件

### 后端
- `server/services/graph-service.js` - 图谱服务层
- `server/routes/graph.js` - API 路由
- `server/index.js` - 路由注册

### 前端
- `src/views/KnowledgeGraphView.vue` - 主页面
- `src/components/GraphVisualization.vue` - 图表组件
- `src/stores/graph.js` - 状态管理
- `src/router/index.js` - 路由配置

### 文档
- `docs/knowledge-graph.md` - 本文档
- `CLAUDE.md` - 项目总览

## 更新日志

### v1.0.0 (2026-01-18)
- ✅ 实现基础知识图谱可视化
- ✅ 支持内容-标签关联
- ✅ 支持内容-内容关联(标签共现)
- ✅ 支持内容-内容关联(关键词相似度)
- ✅ 实现筛选和交互功能
- ✅ 实现节点详情面板
- ✅ 实现相关节点推荐
- ✅ 适配深色/浅色主题

## 贡献指南

如需扩展知识图谱功能,请参考以下步骤:

1. **添加新的关联算法**:
   - 在 `graph-service.js` 中添加新方法
   - 在 `getGraphData()` 中调用新方法
   - 更新边的样式配置

2. **添加新的筛选器**:
   - 在 `KnowledgeGraphView.vue` 中添加筛选器 UI
   - 在 `graph.js` store 中更新 `filters` 状态
   - 在 `graph-service.js` 中处理新的筛选参数

3. **优化可视化效果**:
   - 修改 `GraphVisualization.vue` 中的 ECharts 配置
   - 调整力导向布局参数
   - 自定义节点和边的样式

## 联系方式

如有问题或建议,请通过以下方式联系:
- GitHub Issues: [项目仓库]
- 邮箱: [联系邮箱]
