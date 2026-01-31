<template>
  <div class="research-list-view">
    <div class="header">
      <h1>研究助手</h1>
      <div class="header-actions">
        <button
          class="btn-primary"
          @click="showCreateDialog = true"
        >
          + 新建研究项目
        </button>
        <button
          class="btn-secondary"
          @click="goBack"
        >
          返回首页
        </button>
      </div>
    </div>

    <div class="main-content">
      <aside class="sidebar">
        <div class="filter-card">
          <h3>状态筛选</h3>
          <div class="filter-content">
            <div
              class="filter-item"
              :class="{ active: filters.status === '' }"
              @click="filterByStatus('')"
            >
              全部
            </div>
            <div
              class="filter-item"
              :class="{ active: filters.status === 'draft' }"
              @click="filterByStatus('draft')"
            >
              草稿
            </div>
            <div
              class="filter-item"
              :class="{ active: filters.status === 'analyzing' }"
              @click="filterByStatus('analyzing')"
            >
              分析中
            </div>
            <div
              class="filter-item"
              :class="{ active: filters.status === 'researching' }"
              @click="filterByStatus('researching')"
            >
              研究中
            </div>
            <div
              class="filter-item"
              :class="{ active: filters.status === 'done' }"
              @click="filterByStatus('done')"
            >
              已完成
            </div>
          </div>
        </div>
      </aside>

      <main class="content-area">
        <div
          v-if="loading"
          class="loading"
        >
          加载中...
        </div>
        <div
          v-else-if="error"
          class="error"
        >
          {{ error }}
        </div>
        <div
          v-else-if="projects.length === 0"
          class="empty"
        >
          暂无研究项目，点击右上角"新建研究项目"开始吧！
        </div>
        <div
          v-else
          class="projects-grid"
        >
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="goToProject(project.id)"
          >
            <div class="card-header">
              <h3>{{ project.title }}</h3>
              <span
                class="status-badge"
                :class="getStatusClass(project.status)"
              >
                {{ getStatusText(project.status) }}
              </span>
            </div>
            <div
              v-if="project.description"
              class="card-description"
            >
              {{ truncate(project.description, 100) }}
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-icon">❓</span>
                <span class="stat-text">{{ project.stats?.question_count || 0 }} 个问题</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📚</span>
                <span class="stat-text">{{ project.stats?.material_count || 0 }} 份资料</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="time-text">创建于 {{ formatDate(project.created_at) }}</span>
              <div
                class="card-actions"
                @click.stop
              >
                <button
                  class="btn-icon"
                  title="编辑"
                  @click="editProject(project)"
                >
                  ✏️
                </button>
                <button
                  class="btn-icon"
                  title="删除"
                  @click="deleteProject(project.id)"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="hasMore"
          class="load-more-container"
        >
          <button
            class="btn-load-more"
            :disabled="loading"
            @click="handleLoadMore"
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </main>
    </div>

    <!-- 创建/编辑项目对话框 -->
    <div
      v-if="showCreateDialog"
      class="modal-overlay"
      @click="closeDialog"
    >
      <div
        class="modal-content"
        @click.stop
      >
        <div class="modal-header">
          <h2>{{ editingProject ? '编辑研究项目' : '新建研究项目' }}</h2>
          <button
            class="btn-close"
            @click="closeDialog"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>研究主题 *</label>
            <input
              v-model="formData.title"
              type="text"
              placeholder="例如：Vue 3 组件设计最佳实践"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>研究目标</label>
            <textarea
              v-model="formData.description"
              placeholder="描述你想要研究的内容和目标..."
              class="form-textarea"
              rows="4"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-secondary"
            @click="closeDialog"
          >
            取消
          </button>
          <button
            class="btn-primary"
            :disabled="!formData.title"
            @click="handleSubmit"
          >
            {{ editingProject ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useResearchStore } from '../stores/research'
import { formatDate, truncateText } from '../utils/helpers'

const router = useRouter()
const researchStore = useResearchStore()

const showCreateDialog = ref(false)
const editingProject = ref(null)
const formData = ref({
  title: '',
  description: ''
})

const projects = computed(() => researchStore.projects)
const loading = computed(() => researchStore.loading)
const error = computed(() => researchStore.error)
const filters = computed(() => researchStore.filters)
const pagination = computed(() => researchStore.pagination)

const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.limit)
})

const hasMore = computed(() => {
  return pagination.value.page < totalPages.value
})

onMounted(() => {
  researchStore.fetchProjects()
})

function filterByStatus(status) {
  researchStore.updateFilters({ status })
}

function goToProject(id) {
  router.push(`/research/${id}`)
}

function goBack() {
  router.push('/')
}

function editProject(project) {
  editingProject.value = project
  formData.value = {
    title: project.title,
    description: project.description || ''
  }
  showCreateDialog.value = true
}

async function deleteProject(id) {
  if (!confirm('确定要删除这个研究项目吗？所有相关数据都会被删除。')) {
    return
  }

  try {
    await researchStore.deleteProject(id)
  } catch (err) {
    alert('删除失败：' + err.message)
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editingProject.value = null
  formData.value = {
    title: '',
    description: ''
  }
}

async function handleSubmit() {
  try {
    if (editingProject.value) {
      await researchStore.updateProject(editingProject.value.id, formData.value)
    } else {
      const result = await researchStore.createProject(formData.value)
      // 创建成功后跳转到项目详情页
      router.push(`/research/${result.id}`)
    }
    closeDialog()
  } catch (err) {
    alert('操作失败：' + err.message)
  }
}

async function handleLoadMore() {
  await researchStore.loadMore()
}

function truncate(text, length) {
  return truncateText(text, length)
}

function getStatusText(status) {
  const statusMap = {
    draft: '草稿',
    analyzing: '分析中',
    researching: '研究中',
    done: '已完成'
  }
  return statusMap[status] || status
}

function getStatusClass(status) {
  return `status-${status}`
}
</script>

<style scoped>
.research-list-view {
  min-height: 100vh;
  background: radial-gradient(circle at top left, #1e293b 0%, var(--bg-body) 40%),
              radial-gradient(circle at bottom right, #1e1b4b 0%, var(--bg-body) 40%);
  color: var(--text-primary);
}

.header {
  background: rgba(26, 29, 36, 0.8);
  padding: 20px 40px;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 24px;
  margin: 0;
  background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-content {
  display: grid;
  grid-template-columns: 280px 1fr;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 30px 40px;
  gap: 30px;
}

.sidebar {
  position: sticky;
  top: 100px;
  align-self: flex-start;
}

.filter-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.filter-card h3 {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  font-size: 14px;
}

.filter-item:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
  transform: translateX(4px);
}

.filter-item.active {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent);
  color: var(--accent-primary);
  font-weight: 600;
  border-left: 3px solid var(--accent-primary);
}

.content-area {
  min-width: 0;
}

.loading, .error, .empty {
  text-align: center;
  padding: 60px;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.error {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.project-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-primary);
  box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-header h3 {
  font-size: 18px;
  line-height: 1.5;
  margin: 0;
  flex: 1;
  color: var(--text-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-draft {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

.status-analyzing {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.status-researching {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.status-done {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.card-description {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.card-stats {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-icon {
  font-size: 16px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.btn-load-more {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 12px 32px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.btn-load-more:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-2px);
}

.btn-load-more:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 28px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px;
  background: var(--bg-body);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>
