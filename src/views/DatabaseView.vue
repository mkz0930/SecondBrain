<template>
  <div class="database-view">
    <div class="header">
      <h1>📊 数据库看板</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="refreshData">🔄 刷新</button>
        <button class="btn-secondary" @click="goBack">← 返回</button>
      </div>
    </div>

    <div class="dashboard-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner-large"></div>
        <p>加载数据中...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>❌ {{ error }}</p>
        <button class="btn-primary" @click="refreshData">重试</button>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="dashboard-grid">
        <!-- Database Overview -->
        <div class="card overview-card">
          <h2>📦 数据库概览</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">内容总数</div>
              <div class="stat-value">{{ overview.tables?.contents || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">已删除内容</div>
              <div class="stat-value deleted">{{ overview.tables?.deleted_contents || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">标签数</div>
              <div class="stat-value">{{ overview.tables?.tags || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">标签关联</div>
              <div class="stat-value">{{ overview.tables?.content_tags || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">注释数</div>
              <div class="stat-value">{{ overview.tables?.annotations || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">访问记录</div>
              <div class="stat-value">{{ overview.tables?.access_logs || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">同步映射</div>
              <div class="stat-value">{{ overview.tables?.feishu_sync_mapping || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">同步日志</div>
              <div class="stat-value">{{ overview.tables?.feishu_sync_log || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">每日总结</div>
              <div class="stat-value">{{ overview.tables?.daily_summaries || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">研究项目</div>
              <div class="stat-value">{{ overview.tables?.research_projects || 0 }}</div>
            </div>
          </div>
        </div>

        <!-- Sync Statistics -->
        <div class="card sync-card">
          <h2>🔄 同步统计</h2>
          <div class="sync-config" v-if="syncStats.config">
            <div class="config-item">
              <span class="config-label">同步状态:</span>
              <span class="config-value" :class="{ enabled: syncStats.config.enabled }">
                {{ syncStats.config.enabled ? '✓ 已启用' : '✕ 已禁用' }}
              </span>
            </div>
            <div class="config-item" v-if="syncStats.config.last_sync_at">
              <span class="config-label">最后同步:</span>
              <span class="config-value">{{ formatDate(syncStats.config.last_sync_at) }}</span>
            </div>
            <div class="config-item" v-if="syncStats.config.consecutive_failures > 0">
              <span class="config-label">连续失败:</span>
              <span class="config-value error">{{ syncStats.config.consecutive_failures }} 次</span>
            </div>
          </div>

          <div class="sync-stats-grid">
            <div class="stat-item">
              <div class="stat-label">总同步次数</div>
              <div class="stat-value">{{ syncStats.statistics?.total_syncs || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">成功率</div>
              <div class="stat-value success">{{ syncStats.statistics?.success_rate || 0 }}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">处理记录数</div>
              <div class="stat-value">{{ syncStats.statistics?.total_records_processed || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">冲突解决</div>
              <div class="stat-value">{{ syncStats.statistics?.total_conflicts || 0 }}</div>
            </div>
          </div>

          <div class="sync-direction" v-if="Object.keys(syncStats.mapping_by_direction || {}).length > 0">
            <h3>同步方向分布</h3>
            <div class="direction-list">
              <div v-for="(count, direction) in syncStats.mapping_by_direction" :key="direction" class="direction-item">
                <span class="direction-label">{{ formatDirection(direction) }}</span>
                <span class="direction-count">{{ count }}</span>
              </div>
            </div>
          </div>

          <div class="recent-syncs" v-if="syncStats.recent_syncs?.length > 0">
            <h3>最近同步记录</h3>
            <div class="sync-list">
              <div v-for="sync in syncStats.recent_syncs.slice(0, 5)" :key="sync.id" class="sync-item">
                <div class="sync-header">
                  <span class="sync-type">{{ formatSyncType(sync.sync_type) }}</span>
                  <span class="sync-status" :class="sync.status">{{ sync.status === 'success' ? '✓' : '✕' }}</span>
                </div>
                <div class="sync-details">
                  <span>{{ formatDateTime(sync.start_at) }}</span>
                  <span v-if="sync.total_count">{{ sync.success_count }}/{{ sync.total_count }} 成功</span>
                </div>
                <div v-if="sync.error_message" class="sync-error">{{ sync.error_message }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Statistics -->
        <div class="card content-card">
          <h2>📝 内容统计</h2>

          <div class="content-section">
            <h3>按类型分布</h3>
            <div class="chart-list">
              <div v-for="item in contentStats.by_type" :key="item.type" class="chart-item">
                <div class="chart-label">{{ item.type || '未分类' }}</div>
                <div class="chart-bar-container">
                  <div class="chart-bar" :style="{ width: getPercentage(item.count, getTotalByType()) + '%' }"></div>
                  <span class="chart-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="content-section" v-if="contentStats.by_source?.length > 0">
            <h3>按来源分布 (Top 10)</h3>
            <div class="chart-list">
              <div v-for="item in contentStats.by_source" :key="item.source" class="chart-item">
                <div class="chart-label">{{ item.source }}</div>
                <div class="chart-bar-container">
                  <div class="chart-bar" :style="{ width: getPercentage(item.count, getTotalBySource()) + '%' }"></div>
                  <span class="chart-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="content-stats-grid">
            <div class="stat-item">
              <div class="stat-label">收藏总数</div>
              <div class="stat-value">{{ contentStats.favorites?.total || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">平均评分</div>
              <div class="stat-value">{{ contentStats.favorites?.avg_rating || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">有摘要内容</div>
              <div class="stat-value">{{ contentStats.summaries?.total || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">摘要覆盖率</div>
              <div class="stat-value">{{ contentStats.summaries?.percentage || 0 }}%</div>
            </div>
          </div>

          <div class="content-section" v-if="contentStats.timeline?.length > 0">
            <h3>最近30天创建趋势</h3>
            <div class="timeline-list">
              <div v-for="item in contentStats.timeline.slice(0, 10)" :key="item.date" class="timeline-item">
                <span class="timeline-date">{{ item.date }}</span>
                <span class="timeline-count">{{ item.count }} 条</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tag Statistics -->
        <div class="card tag-card">
          <h2>🏷️ 标签统计</h2>

          <div class="tag-section">
            <h3>最常用标签 (Top 20)</h3>
            <div class="tag-list">
              <div v-for="tag in tagStats.most_used?.slice(0, 20)" :key="tag.id" class="tag-item">
                <span class="tag-badge" :style="{ backgroundColor: tag.color }">{{ tag.name }}</span>
                <span class="tag-count">{{ tag.usage_count }} 次</span>
              </div>
            </div>
          </div>

          <div class="tag-section" v-if="tagStats.unused?.length > 0">
            <h3>未使用标签 ({{ tagStats.unused.length }})</h3>
            <div class="tag-list">
              <div v-for="tag in tagStats.unused.slice(0, 10)" :key="tag.id" class="tag-item unused">
                <span class="tag-badge" :style="{ backgroundColor: tag.color }">{{ tag.name }}</span>
              </div>
            </div>
          </div>

          <div class="tag-section" v-if="tagStats.distribution?.length > 0">
            <h3>使用频率分布</h3>
            <div class="distribution-list">
              <div v-for="item in tagStats.distribution" :key="item.range" class="distribution-item">
                <span class="distribution-label">{{ item.range }} 次使用</span>
                <span class="distribution-count">{{ item.tag_count }} 个标签</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Research Statistics -->
        <div class="card research-card" v-if="researchStats.recent_projects?.length > 0">
          <h2>🔬 研究统计</h2>

          <div class="research-stats-grid">
            <div class="stat-item">
              <div class="stat-label">总问题数</div>
              <div class="stat-value">{{ researchStats.questions?.total || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">已完成问题</div>
              <div class="stat-value success">{{ researchStats.questions?.completed || 0 }}</div>
            </div>
          </div>

          <div class="research-section" v-if="researchStats.projects_by_status?.length > 0">
            <h3>项目状态分布</h3>
            <div class="status-list">
              <div v-for="item in researchStats.projects_by_status" :key="item.status" class="status-item">
                <span class="status-label">{{ item.status }}</span>
                <span class="status-count">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div class="research-section">
            <h3>最近项目</h3>
            <div class="project-list">
              <div v-for="project in researchStats.recent_projects.slice(0, 5)" :key="project.id" class="project-item">
                <div class="project-title">{{ project.title }}</div>
                <div class="project-meta">
                  <span class="project-status">{{ project.status }}</span>
                  <span class="project-date">{{ formatDate(project.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="research-section" v-if="researchStats.materials_by_type?.length > 0">
            <h3>研究材料类型</h3>
            <div class="material-list">
              <div v-for="item in researchStats.materials_by_type" :key="item.type" class="material-item">
                <span class="material-type">{{ item.type }}</span>
                <span class="material-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Daily Summary Statistics -->
        <div class="card summary-card" v-if="summaryStats.statistics?.total > 0">
          <h2>📅 每日总结统计</h2>

          <div class="summary-stats-grid">
            <div class="stat-item">
              <div class="stat-label">总结总数</div>
              <div class="stat-value">{{ summaryStats.statistics?.total || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">平均长度</div>
              <div class="stat-value">{{ summaryStats.statistics?.avg_length || 0 }} 字</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最早日期</div>
              <div class="stat-value small">{{ summaryStats.statistics?.earliest_date || '-' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最新日期</div>
              <div class="stat-value small">{{ summaryStats.statistics?.latest_date || '-' }}</div>
            </div>
          </div>

          <div class="summary-section" v-if="summaryStats.recent_summaries?.length > 0">
            <h3>最近总结</h3>
            <div class="summary-list">
              <div v-for="summary in summaryStats.recent_summaries.slice(0, 10)" :key="summary.date" class="summary-item">
                <span class="summary-date">{{ summary.date }}</span>
                <span class="summary-length">{{ summary.summary_length }} 字</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const loading = ref(true)
const error = ref(null)

const overview = ref({})
const syncStats = ref({})
const contentStats = ref({})
const tagStats = ref({})
const researchStats = ref({})
const summaryStats = ref({})

const fetchData = async () => {
  loading.value = true
  error.value = null

  try {
    const [
      overviewRes,
      syncRes,
      contentRes,
      tagRes,
      researchRes,
      summaryRes
    ] = await Promise.all([
      axios.get('/api/database/overview'),
      axios.get('/api/database/sync-stats'),
      axios.get('/api/database/content-stats'),
      axios.get('/api/database/tag-stats'),
      axios.get('/api/database/research-stats'),
      axios.get('/api/database/summary-stats')
    ])

    overview.value = overviewRes.data
    syncStats.value = syncRes.data
    contentStats.value = contentRes.data
    tagStats.value = tagRes.data
    researchStats.value = researchRes.data
    summaryStats.value = summaryRes.data
  } catch (err) {
    console.error('Failed to fetch database stats:', err)
    error.value = err.response?.data?.error || '加载数据失败'
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  fetchData()
}

const goBack = () => {
  router.push('/')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatDirection = (direction) => {
  const map = {
    'to_feishu': '→ 推送到飞书',
    'from_feishu': '← 从飞书拉取',
    'merged': '↔ 双向合并',
    'unknown': '未知'
  }
  return map[direction] || direction
}

const formatSyncType = (type) => {
  const map = {
    'manual': '手动同步',
    'scheduled': '定时同步',
    'auto': '自动同步'
  }
  return map[type] || type
}

const getTotalByType = () => {
  return contentStats.value.by_type?.reduce((sum, item) => sum + item.count, 0) || 1
}

const getTotalBySource = () => {
  return contentStats.value.by_source?.reduce((sum, item) => sum + item.count, 0) || 1
}

const getPercentage = (value, total) => {
  return total > 0 ? (value / total * 100).toFixed(1) : 0
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.database-view {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.spinner-large {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-tertiary);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
}

.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--bg-tertiary);
}

.card h3 {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 1.5rem 0 1rem 0;
}

.stats-grid, .sync-stats-grid, .content-stats-grid, .research-stats-grid, .summary-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: bold;
  color: var(--primary-color);
}

.stat-value.small {
  font-size: 1rem;
}

.stat-value.success {
  color: #10b981;
}

.stat-value.deleted, .stat-value.error {
  color: #ef4444;
}

.sync-config {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.config-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.config-label {
  color: var(--text-secondary);
}

.config-value {
  color: var(--text-primary);
  font-weight: 500;
}

.config-value.enabled {
  color: #10b981;
}

.config-value.error {
  color: #ef4444;
}

.sync-direction, .content-section, .tag-section, .research-section, .summary-section {
  margin-top: 1.5rem;
}

.direction-list, .status-list, .distribution-list, .material-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.direction-item, .status-item, .distribution-item, .material-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.direction-label, .status-label, .distribution-label, .material-type {
  color: var(--text-primary);
}

.direction-count, .status-count, .distribution-count, .material-count {
  color: var(--primary-color);
  font-weight: 600;
}

.sync-list, .project-list, .summary-list, .timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sync-item, .project-item, .summary-item, .timeline-item {
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.sync-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.sync-type {
  font-weight: 600;
  color: var(--text-primary);
}

.sync-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.sync-status.success {
  background: #10b98120;
  color: #10b981;
}

.sync-status.failed {
  background: #ef444420;
  color: #ef4444;
}

.sync-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sync-error {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #ef444410;
  color: #ef4444;
  border-radius: 4px;
  font-size: 0.875rem;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chart-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chart-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.chart-bar-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 24px;
}

.chart-bar {
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s;
  min-width: 2px;
}

.chart-value {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 600;
  min-width: 40px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.tag-item.unused {
  opacity: 0.6;
}

.tag-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.tag-count {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.project-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.project-status {
  padding: 0.125rem 0.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
}

.summary-date, .timeline-date {
  color: var(--text-primary);
  font-weight: 500;
}

.summary-length, .timeline-count {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .database-view {
    padding: 1rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
