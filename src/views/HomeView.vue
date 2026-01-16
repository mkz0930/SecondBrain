<template>
  <div class="home-view">
    <div class="header">
      <h1>外挂大脑</h1>
      <div class="header-actions">
        <input 
          v-model="searchKeyword" 
          type="text" 
          placeholder="搜索内容..." 
          @keyup.enter="handleSearch"
          class="search-input"
        />
        <div class="sync-status" v-if="isSyncing && syncStatus.message">
          <span class="status-text">{{ syncStatus.message }}</span>
          <div class="progress-bar" v-if="syncStatus.progress > 0">
            <div class="progress-fill" :style="{ width: syncStatus.progress + '%' }"></div>
          </div>
        </div>
        <button 
          class="btn-secondary sync-btn" 
          @click="handleSync" 
          :disabled="isSyncing"
          title="同步飞书数据">
          {{ isSyncing ? '同步中...' : '同步飞书' }}
        </button>
        <button class="btn-primary" @click="goToNew">+ 新建内容</button>
        <button class="btn-secondary" @click="handleLogout">登出</button>
      </div>
    </div>

    <div class="main-content">
      <aside class="sidebar">
        <div class="filter-section">
          <h3>内容类型</h3>
          <div class="filter-item" 
               :class="{ active: filters.type === '' }" 
               @click="filterByType('')">
            全部
          </div>
          <div class="filter-item" 
               :class="{ active: filters.type === 'note' }" 
               @click="filterByType('note')">
            随笔
          </div>
          <div class="filter-item" 
               :class="{ active: filters.type === 'article' }" 
               @click="filterByType('article')">
            文章
          </div>
          <div class="filter-item" 
               :class="{ active: filters.type === 'media' }" 
               @click="filterByType('media')">
            音视频
          </div>
          <div class="filter-item" 
               :class="{ active: filters.type === 'book' }" 
               @click="filterByType('book')">
            书籍
          </div>
        </div>

        <div class="filter-section">
          <h3>收藏</h3>
          <div class="filter-item" 
               :class="{ active: filters.is_favorite === null }" 
               @click="filterByFavorite(null)">
            全部
          </div>
          <div class="filter-item" 
               :class="{ active: filters.is_favorite === true }" 
               @click="filterByFavorite(true)">
            已收藏
          </div>
        </div>

        <div class="filter-section" v-if="tagStore.tags.length > 0">
          <h3>标签</h3>
          <div class="filter-item" 
               :class="{ active: filters.tag === '' }" 
               @click="filterByTag('')">
            全部
          </div>
          <div 
            v-for="tag in tagStore.tags" 
            :key="tag.id"
            class="filter-item" 
            :class="{ active: filters.tag === tag.name }" 
            @click="filterByTag(tag.name)">
            {{ tag.name }} ({{ tag.count }})
          </div>
        </div>
      </aside>

      <main class="content-area">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="contents.length === 0" class="empty">暂无内容</div>
        <div v-else class="timeline-view">
          <div v-for="group in groupedContents" :key="group.date" class="timeline-group">
            <div class="timeline-header">
              <span class="timeline-date">{{ group.displayDate }}</span>
              <span class="timeline-count">{{ group.count }}条记录</span>
            </div>
            
            <div class="timeline-items">
              <div 
                v-for="content in group.items" 
                :key="content.id"
                class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="content-card" @click="goToDetail(content.id)">
                  <div class="card-header">
                    <h3>{{ content.title }}</h3>
                    <button 
                      class="favorite-btn"
                      :class="{ active: content.is_favorite }"
                      @click.stop="toggleFavorite(content.id)">
                      {{ content.is_favorite ? '★' : '☆' }}
                    </button>
                  </div>
                  <div class="card-meta">
                    <span class="type-badge">{{ getTypeName(content.type) }}</span>
                    <span class="rating" v-if="getRating(content) > 0">
                      {{ '★'.repeat(getRating(content)) }}{{ '☆'.repeat(5 - getRating(content)) }}
                    </span>
                    <span class="visit-count">访问 {{ content.access_count || 0 }} 次</span>
                  </div>
                  <div class="card-content">
                    <div v-if="content.summary" class="content-summary">
                      {{ content.summary }}
                    </div>
                    <div class="content-text">{{ truncate(content.content) }}</div>
                    <div v-if="content.source" class="content-source">
                      <span class="source-label">URL:</span> {{ content.source }}
                    </div>
                  </div>
                  <div class="card-tags" v-if="content.tags && content.tags.length > 0">
                    <span 
                      v-for="tag in content.tags" 
                      :key="tag.id"
                      class="tag"
                      :style="{ backgroundColor: tag.color || '#e4e7ed', color: '#1a1d24' }">
                      {{ tag.name }}
                    </span>
                  </div>
                  <div class="card-footer">
                    <div class="time-info">
                      <div class="time-item">创建时间: {{ formatDateTime(content.created_at) }}</div>
                      <div v-if="content.updated_at" class="time-item update-time">更新时间: {{ formatDateTime(content.updated_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMore" class="load-more-container">
          <button 
            class="btn-load-more"
            @click="handleLoadMore"
            :disabled="loading">
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
        <div v-else-if="contents.length > 0" class="no-more">
          没有更多内容了
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContentStore } from '../stores/content'
import { useTagStore } from '../stores/tag'
import { useUserStore } from '../stores/user'
import { formatDate, truncateText, getContentTypeName, formatDateTime } from '../utils/helpers'
import api from '../utils/api'

const router = useRouter()
const contentStore = useContentStore()
const tagStore = useTagStore()
const userStore = useUserStore()

const searchKeyword = ref('')

const contents = computed(() => contentStore.contents)
const loading = computed(() => contentStore.loading)
const error = computed(() => contentStore.error)
const pagination = computed(() => contentStore.pagination)

const isSyncing = ref(false)
const syncStatus = ref({
  message: '',
  progress: 0
})
const filters = computed(() => contentStore.filters)

const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.limit)
})

const hasMore = computed(() => {
  return pagination.value.page < totalPages.value
})

// Group contents by date
const groupedContents = computed(() => {
  const groups = {}
  contents.value.forEach(content => {
    const dateStr = formatDate(content.created_at)
    if (!groups[dateStr]) {
      const dateObj = new Date(content.created_at)
      const displayDate = dateObj.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
      })

      groups[dateStr] = {
        date: dateStr,
        displayDate,
        items: [],
        count: 0
      }
    }
    groups[dateStr].items.push(content)
    groups[dateStr].count++
  })
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

onMounted(() => {
  contentStore.fetchContents()
  tagStore.fetchTags()
})

function handleSearch() {
  contentStore.updateFilters({ search: searchKeyword.value })
}

function filterByType(type) {
  contentStore.updateFilters({ type })
}

function filterByFavorite(isFavorite) {
  contentStore.updateFilters({ is_favorite: isFavorite })
}

function filterByTag(tag) {
  contentStore.updateFilters({ tag })
}

function goToNew() {
  router.push('/content/new')
}

function goToDetail(id) {
  router.push(`/content/${id}`)
}

async function toggleFavorite(id) {
  try {
    await contentStore.toggleFavorite(id)
  } catch (err) {
    alert('切换收藏失败')
  }
}

async function handleLoadMore() {
  await contentStore.loadMore()
}

function truncate(text) {
  return truncateText(text, 150)
}

function getTypeName(type) {
  return getContentTypeName(type)
}

function getRating(content) {
  return content.rating || content.smart_rating || 0
}

async function handleLogout() {
  if (!confirm('确定要登出吗？')) {
    return
  }
  
  try {
    await api.post('/api/auth/logout')
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    userStore.clearAuth()
    router.push('/login')
  }
}

async function handleSync() {
  if (isSyncing.value) return
  
  isSyncing.value = true
  try {
    await api.post('/api/feishu/sync', { direction: 'both' })
    await new Promise(resolve => setTimeout(resolve, 2000))
    // 同步完成后刷新本地内容列表和标签
    await contentStore.fetchContents()
    await tagStore.fetchTags()
  } catch (err) {
    console.error('Sync failed:', err)
    const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message
    alert('同步失败: ' + errorMessage)
  } finally {
    isSyncing.value = false
  }
}
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background: radial-gradient(circle at top left, #1e293b 0%, var(--bg-body) 40%),
              radial-gradient(circle at bottom right, #1e1b4b 0%, var(--bg-body) 40%);
  color: var(--text-primary);
  position: relative;
  overflow-x: hidden;
}

/* Background Accents */
.home-view::before {
  content: "";
  position: absolute;
  top: -100px;
  right: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.home-view::after {
  content: "";
  position: absolute;
  bottom: -100px;
  left: -100px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.1), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
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
  gap: 24px;
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
  align-items: center;
}

.search-input {
  width: 300px;
  background: var(--bg-surface-hover);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.main-content {
  display: grid;
  grid-template-columns: 260px 1fr;
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 40px;
  gap: 30px;
  position: relative;
  z-index: 1;
}

.sidebar {
  position: sticky;
  top: 100px;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-section {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border-color);
}

.filter-section h3 {
  font-size: 12px;
  margin: 0 0 16px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.filter-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.filter-item:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.filter-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
  font-weight: 600;
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

/* Timeline */
.timeline-view {
  position: relative;
  padding-left: 24px;
}

.timeline-view::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 7px;
  width: 2px;
  background: linear-gradient(to bottom, var(--accent-primary), transparent);
  opacity: 0.3;
  z-index: 0;
}

.timeline-group {
  margin-bottom: 40px;
  position: relative;
}

.timeline-header {
  margin-bottom: 24px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  position: sticky;
  top: 85px;
  z-index: 10;
  background: rgba(15, 23, 42, 0.95); /* Match body bg somewhat */
  backdrop-filter: blur(8px);
  padding: 16px 0 16px 20px;
  border-bottom: 1px solid var(--border-color);
  margin-left: -24px;
  width: calc(100% + 24px);
}

.timeline-header::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background: var(--accent-primary);
  border: 3px solid #0f172a; /* Match background color */
  border-radius: 50%;
  z-index: 11;
  box-shadow: 0 0 10px var(--accent-primary);
}

.timeline-date {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.timeline-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.timeline-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.content-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-primary);
  box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3);
}

/* Glass glow effect on hover */
.content-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.content-card:hover::after {
  opacity: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.card-header h3 {
  font-size: 18px;
  line-height: 1.5;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-primary);
}

.favorite-btn {
  background: transparent;
  padding: 4px;
  color: var(--text-tertiary);
  font-size: 20px;
}

.favorite-btn.active {
  color: var(--warning);
}

.card-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.type-badge {
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.rating {
  color: var(--warning);
  letter-spacing: 2px;
}

.visit-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-content {
  flex: 1;
  margin-bottom: 16px;
}

.content-summary {
  background: rgba(59, 130, 246, 0.05);
  border-left: 3px solid var(--accent-secondary);
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.content-text {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.content-source {
  margin-top: 12px;
  font-size: 12px;
  color: var(--accent-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
}

.source-label {
  color: var(--text-tertiary);
  margin-right: 4px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.card-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-tertiary);
}

.time-info {
  display: flex;
  justify-content: space-between;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-bottom: 40px;
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-load-more:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.btn-load-more:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.no-more {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 40px;
  color: var(--text-tertiary);
  font-size: 14px;
  position: relative;
}

.no-more::before,
.no-more::after {
  content: "";
  display: inline-block;
  width: 40px;
  height: 1px;
  background: var(--border-color);
  vertical-align: middle;
  margin: 0 12px;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}
</style>
