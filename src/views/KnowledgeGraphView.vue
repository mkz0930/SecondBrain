<template>
  <div class="knowledge-graph-view">
    <!-- 顶部工具栏 -->
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <button
          class="btn-back"
          title="返回首页"
          @click="goToHome"
        >
          ← 返回首页
        </button>
        <h1 class="page-title">
          知识图谱
        </h1>
        <div
          v-if="graphStore.hasData"
          class="stats"
        >
          <span class="stat-item">
            <span class="stat-label">节点:</span>
            <span class="stat-value">{{ graphStore.nodeCount }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">连接:</span>
            <span class="stat-value">{{ graphStore.edgeCount }}</span>
          </span>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- 筛选器 -->
        <div class="filter-group">
          <!-- 内容类型筛选 -->
          <select
            v-model="selectedContentTypes"
            multiple
            class="filter-select"
            @change="applyFilters"
          >
            <option value="">
              全部类型
            </option>
            <option value="随笔">
              随笔
            </option>
            <option value="文章">
              文章
            </option>
            <option value="音视频">
              音视频
            </option>
            <option value="书籍">
              书籍
            </option>
            <option value="随便">
              随便
            </option>
            <option value="抖音">
              抖音
            </option>
            <option value="公众号">
              公众号
            </option>
            <option value="文档">
              文档
            </option>
            <option value="其他">
              其他
            </option>
          </select>

          <!-- 标签筛选 -->
          <select
            v-model="selectedTagIds"
            multiple
            class="filter-select"
            @change="applyFilters"
          >
            <option value="">
              全部标签
            </option>
            <option
              v-for="tag in tagStore.tags"
              :key="tag.id"
              :value="tag.id"
            >
              {{ tag.name }}
            </option>
          </select>

          <!-- 最小连接数 -->
          <div class="filter-input-group">
            <label>最小连接:</label>
            <input
              v-model.number="minConnections"
              type="number"
              min="0"
              max="10"
              class="filter-input"
              @change="applyFilters"
            >
          </div>
        </div>

        <!-- 操作按钮 -->
        <button
          class="btn btn-secondary"
          @click="resetFilters"
        >
          重置筛选
        </button>
        <button
          class="btn btn-primary"
          :disabled="graphStore.loading"
          @click="refreshGraph"
        >
          {{ graphStore.loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="graph-content">
      <!-- 图表区域 -->
      <div class="graph-container">
        <GraphVisualization
          v-if="graphStore.hasData"
          :graph-data="graphStore.graphData"
          @node-click="handleNodeClick"
          @node-dblclick="handleNodeDoubleClick"
        />

        <!-- 加载状态 -->
        <div
          v-else-if="graphStore.loading"
          class="loading-state"
        >
          <div class="spinner" />
          <p>正在生成知识图谱...</p>
        </div>

        <!-- 错误状态 -->
        <div
          v-else-if="graphStore.error"
          class="error-state"
        >
          <p class="error-message">
            {{ graphStore.error }}
          </p>
          <button
            class="btn btn-primary"
            @click="refreshGraph"
          >
            重试
          </button>
        </div>

        <!-- 空状态 -->
        <div
          v-else
          class="empty-state"
        >
          <p>暂无数据，请先添加内容</p>
        </div>
      </div>

      <!-- 侧边详情面板 -->
      <transition name="slide">
        <div
          v-if="graphStore.selectedNode"
          class="detail-panel"
        >
          <div class="panel-header">
            <h3>节点详情</h3>
            <button
              class="btn-close"
              @click="closeDetail"
            >
              ×
            </button>
          </div>

          <div class="panel-content">
            <!-- 节点基本信息 -->
            <div class="node-info">
              <div
                class="node-type-badge"
                :style="{ backgroundColor: graphStore.selectedNode.itemStyle?.color }"
              >
                {{ graphStore.selectedNode.type === 'content' ? '内容' : '标签' }}
              </div>
              <h4 class="node-name">
                {{ graphStore.selectedNode.name }}
              </h4>
            </div>

            <!-- 内容节点详情 -->
            <div
              v-if="graphStore.selectedNode.type === 'content'"
              class="content-detail"
            >
              <div class="detail-item">
                <span class="detail-label">类型:</span>
                <span class="detail-value">{{ graphStore.selectedNode.data.type }}</span>
              </div>
              <div
                v-if="graphStore.selectedNode.data.source"
                class="detail-item"
              >
                <span class="detail-label">来源:</span>
                <span class="detail-value">{{ graphStore.selectedNode.data.source }}</span>
              </div>
              <div
                v-if="graphStore.selectedNode.data.rating"
                class="detail-item"
              >
                <span class="detail-label">评分:</span>
                <span class="detail-value">{{ '⭐'.repeat(graphStore.selectedNode.data.rating) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">标签数:</span>
                <span class="detail-value">{{ graphStore.selectedNode.data.tag_count }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">创建时间:</span>
                <span class="detail-value">{{ formatDate(graphStore.selectedNode.data.created_at) }}</span>
              </div>

              <!-- 操作按钮 -->
              <div class="detail-actions">
                <button
                  class="btn btn-primary btn-sm"
                  @click="viewContent(graphStore.selectedNode.data.id)"
                >
                  查看详情
                </button>
              </div>
            </div>

            <!-- 标签节点详情 -->
            <div
              v-else-if="graphStore.selectedNode.type === 'tag'"
              class="tag-detail"
            >
              <div class="detail-item">
                <span class="detail-label">关联内容:</span>
                <span class="detail-value">{{ graphStore.selectedNode.data.content_count }} 个</span>
              </div>
            </div>

            <!-- 相关节点 -->
            <div
              v-if="graphStore.relatedNodes.length > 0"
              class="related-nodes"
            >
              <h5>相关节点</h5>
              <ul class="related-list">
                <li
                  v-for="node in graphStore.relatedNodes"
                  :key="node.id"
                  class="related-item"
                  @click="selectRelatedNode(node)"
                >
                  <span class="related-name">{{ node.title || node.name }}</span>
                  <span class="related-meta">{{ node.common_tags || node.common_contents }} 个共同</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGraphStore } from '../stores/graph'
import { useTagStore } from '../stores/tag'
import GraphVisualization from '../components/GraphVisualization.vue'

const router = useRouter()
const graphStore = useGraphStore()
const tagStore = useTagStore()

// 筛选器状态
const selectedContentTypes = ref([])
const selectedTagIds = ref([])
const minConnections = ref(0)

// 初始化
onMounted(async () => {
  // 加载标签列表（用于筛选器）
  await tagStore.fetchTags()

  // 加载图谱数据
  await refreshGraph()
})

// 刷新图谱
async function refreshGraph() {
  try {
    await graphStore.fetchGraphData({
      contentTypes: selectedContentTypes.value,
      tagIds: selectedTagIds.value,
      minConnections: minConnections.value
    })
  } catch (error) {
    console.error('Failed to refresh graph:', error)
  }
}

// 应用筛选器
async function applyFilters() {
  graphStore.updateFilters({
    contentTypes: selectedContentTypes.value,
    tagIds: selectedTagIds.value,
    minConnections: minConnections.value
  })
  await refreshGraph()
}

// 重置筛选器
async function resetFilters() {
  selectedContentTypes.value = []
  selectedTagIds.value = []
  minConnections.value = 0
  graphStore.resetFilters()
  await refreshGraph()
}

// 返回首页
function goToHome() {
  router.push('/')
}

// 处理节点点击
async function handleNodeClick(node) {
  graphStore.selectNode(node)

  // 加载节点详情和相关节点
  try {
    await Promise.all([
      graphStore.fetchNodeDetail(node.id),
      graphStore.fetchRelatedNodes(node.id, 10)
    ])
  } catch (error) {
    console.error('Failed to load node details:', error)
  }
}

// 处理节点双击
function handleNodeDoubleClick(node) {
  if (node.type === 'content') {
    viewContent(node.data.id)
  }
}

// 查看内容详情
function viewContent(contentId) {
  router.push(`/content/${contentId}`)
}

// 选择相关节点
function selectRelatedNode(node) {
  // 在图谱中高亮该节点
  const nodeId = node.id ? `content-${node.id}` : `tag-${node.id}`
  const graphNode = graphStore.graphData.nodes.find(n => n.id === nodeId)
  if (graphNode) {
    handleNodeClick(graphNode)
  }
}

// 关闭详情面板
function closeDetail() {
  graphStore.clearSelection()
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.knowledge-graph-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

/* 工具栏 */
.graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-heading);
}

.stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: 600;
  color: var(--color-text);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 筛选器 */
.filter-group {
  display: flex;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  min-width: 120px;
}

.filter-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-input-group label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.filter-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

/* 按钮 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-back:hover {
  background: var(--color-background-mute);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-background-mute);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

/* 主内容区 */
.graph-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.graph-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 状态显示 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: var(--color-error);
  margin-bottom: 1rem;
}

/* 详情面板 */
.detail-panel {
  width: 320px;
  background: var(--color-background-soft);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background: var(--color-background-mute);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* 节点信息 */
.node-info {
  margin-bottom: 1.5rem;
}

.node-type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: white;
  margin-bottom: 0.5rem;
}

.node-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-heading);
  word-break: break-word;
}

/* 详情项 */
.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.detail-label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.detail-value {
  color: var(--color-text);
  text-align: right;
}

.detail-actions {
  margin-top: 1rem;
}

/* 相关节点 */
.related-nodes {
  margin-top: 1.5rem;
}

.related-nodes h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.related-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.related-item:hover {
  background: var(--color-background-mute);
}

.related-name {
  font-size: 0.875rem;
  color: var(--color-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-left: 0.5rem;
}

/* 过渡动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>
