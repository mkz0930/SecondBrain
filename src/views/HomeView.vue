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
        <!-- <button 
          class="btn-secondary" 
          @click="handleResetPull" 
          :disabled="isSyncing"
          title="清空本地并拉取飞书数据"
          style="border-color: #ef4444; color: #ef4444;">
          重置并拉取
        </button> -->
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
        <div v-else class="content-list">
          <div 
            v-for="content in contents" 
            :key="content.id"
            class="content-card"
            @click="goToDetail(content.id)">
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
              <span class="rating" v-if="content.smart_rating !== null && content.smart_rating !== undefined">
                {{ '★'.repeat(content.smart_rating) }}{{ '☆'.repeat(5 - content.smart_rating) }}
              </span>
            </div>
            <div class="card-content">
              {{ truncate(content.content) }}
            </div>
            <div class="card-tags" v-if="content.tags && content.tags.length > 0">
              <span 
                v-for="tag in content.tags" 
                :key="tag.id"
                class="tag"
                :style="{ backgroundColor: tag.color || '#e4e7ed' }">
                {{ tag.name }}
              </span>
            </div>
            <div class="card-footer">
              <span>{{ formatDate(content.created_at) }}</span>
            </div>
          </div>
        </div>

        <div v-if="pagination.total > pagination.limit" class="pagination">
          <button 
            :disabled="pagination.page === 1"
            @click="goToPage(pagination.page - 1)">
            上一页
          </button>
          <span>第 {{ pagination.page }} 页 / 共 {{ totalPages }} 页</span>
          <button 
            :disabled="pagination.page >= totalPages"
            @click="goToPage(pagination.page + 1)">
            下一页
          </button>
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
import { formatDate, truncateText, getContentTypeName } from '../utils/helpers'
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

function goToPage(page) {
  contentStore.updatePage(page)
}

function truncate(text) {
  return truncateText(text, 150)
}

function getTypeName(type) {
  return getContentTypeName(type)
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
    // 无论是否成功，都清除本地认证信息
    userStore.clearAuth()
    router.push('/login')
  }
}

async function handleResetPull() {
  console.log('Reset Pull button clicked') // Debug log
  if (!confirm('确定要清空本地所有数据，并强制从飞书拉取最新数据吗？此操作不可逆！')) {
    return
  }

  // 暂时移除 isSyncing 检查，防止卡死
  // if (isSyncing.value) return
  
  isSyncing.value = true
  try {
    console.log('Sending reset-pull request...')
    // 调用重置并拉取接口
    await api.post('/api/feishu/reset-pull')
    
    alert('请求已发送，正在后台处理。由于是全量拉取，可能需要较长时间，请稍后刷新页面。')
    
    // 给后端更多时间
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 尝试刷新列表
    await contentStore.fetchContents()
    await tagStore.fetchTags()
  } catch (err) {
    console.error('Reset pull failed:', err)
    alert('操作失败: ' + (err.response?.data?.message || err.message))
  } finally {
    isSyncing.value = false
  }
}

async function handleSync() {
  if (isSyncing.value) return
  
  isSyncing.value = true
  try {
    // 默认执行双向同步，确保两端数据一致
    await api.post('/api/feishu/sync', { direction: 'both' })
    
    // 给后端一点时间进行同步处理
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 同步完成后刷新列表，显示最新数据
    await contentStore.fetchContents()
    // 也可以刷新标签
    await tagStore.fetchTags()
    
    // 可选：显示更友好的通知，这里先用 alert 简单处理，或者不做强提示，按钮状态变化即是反馈
    // alert('同步完成') 
  } catch (err) {
    console.error('Sync failed:', err)
    alert('同步失败: ' + (err.response?.data?.message || err.message))
  } finally {
    isSyncing.value = false
  }
}
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  --bg: #eef2ff;
  --surface: rgba(255, 255, 255, 0.92);
  --surface-strong: #ffffff;
  --ink: #0f172a;
  --muted: #64748b;
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --accent-2: #0ea5e9;
  --accent-soft: rgba(37, 99, 235, 0.12);
  --danger: #ef4444;
  --shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
  --shadow-soft: 0 12px 24px rgba(15, 23, 42, 0.08);
  background:
    radial-gradient(900px 520px at 10% -15%, rgba(14, 165, 233, 0.18), transparent 60%),
    radial-gradient(700px 480px at 90% -10%, rgba(37, 99, 235, 0.2), transparent 55%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%);
  font-family: "Source Han Sans SC", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--ink);
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
}

.home-view::before,
.home-view::after {
  content: "";
  position: absolute;
  border-radius: 999px;
  z-index: 0;
  pointer-events: none;
}

.home-view::before {
  width: 420px;
  height: 420px;
  top: -140px;
  right: -140px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 70%);
}

.home-view::after {
  width: 520px;
  height: 520px;
  bottom: -240px;
  left: -200px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.28), transparent 70%);
}

.header {
  background: rgba(255, 255, 255, 0.82);
  padding: 22px 40px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 2;
  backdrop-filter: blur(14px);
  animation: floatIn 0.6s ease both;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 0;
  color: var(--ink);
  font-family: "Source Han Serif SC", "Songti SC", "STSong", serif;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.search-input {
  width: 320px;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 6px 14px rgba(15, 23, 42, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  color: var(--ink);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  outline: none;
  border-color: rgba(37, 99, 235, 0.6);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18), 0 8px 18px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.main-content {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 40px 40px;
  gap: 28px;
  position: relative;
  z-index: 1;
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: 110px;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-section {
  background: var(--surface);
  border-radius: 16px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: var(--shadow-soft);
  animation: floatIn 0.6s ease both;
}

.filter-section h3 {
  font-size: 13px;
  margin: 0 0 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1.6px;
}

.filter-item {
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--muted);
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-item:hover {
  background-color: rgba(37, 99, 235, 0.08);
  color: var(--ink);
}

.filter-item.active {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(14, 165, 233, 0.18));
  color: var(--accent-strong);
  border-color: rgba(37, 99, 235, 0.35);
  font-weight: 600;
}

.content-area {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.loading, .error, .empty {
  text-align: center;
  padding: 44px;
  background: var(--surface);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: var(--shadow-soft);
}

.error {
  color: var(--danger);
  background: rgba(254, 226, 226, 0.85);
  border-color: rgba(239, 68, 68, 0.35);
}

.content-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.content-card {
  background: var(--surface-strong);
  border-radius: 18px;
  padding: 22px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(148, 163, 184, 0.2);
  position: relative;
  overflow: hidden;
  animation: cardIn 0.6s ease both;
}

.content-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow);
  border-color: rgba(37, 99, 235, 0.35);
}

.content-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.9), rgba(14, 165, 233, 0.6));
  opacity: 0.6;
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
  color: var(--ink);
  margin: 0;
  flex: 1;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  padding-right: 8px;
}

.favorite-btn {
  flex-shrink: 0;
  font-size: 18px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.25);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.favorite-btn.active,
.favorite-btn:hover {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.4);
  transform: translateY(-1px);
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(37, 99, 235, 0.12);
  border-radius: 999px;
  font-size: 12px;
  color: var(--accent-strong);
  font-weight: 600;
}

.rating {
  color: #f59e0b;
  font-size: 14px;
}

.source-badge {
  display: inline-block;
  font-size: 12px;
  color: var(--muted);
  background: rgba(148, 163, 184, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.card-content {
  color: #475569;
  line-height: 1.6;
  margin-bottom: 12px;
  min-height: 60px;
}

.card-tags {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #1f2937;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
  font-size: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 18px;
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: var(--shadow-soft);
}

.pagination button {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #fff;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  border-color: rgba(37, 99, 235, 0.4);
  color: var(--accent-strong);
  transform: translateY(-1px);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.3);
}

.btn-secondary {
  padding: 9px 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--muted);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  color: var(--accent-strong);
  border-color: rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 100px;
  justify-content: center;
}

.sync-btn .icon {
  font-size: 16px;
}

@keyframes floatIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-card:nth-child(1) { animation-delay: 0.05s; }
.content-card:nth-child(2) { animation-delay: 0.1s; }
.content-card:nth-child(3) { animation-delay: 0.15s; }
.content-card:nth-child(4) { animation-delay: 0.2s; }
.content-card:nth-child(5) { animation-delay: 0.25s; }
.content-card:nth-child(6) { animation-delay: 0.3s; }

@media (max-width: 1100px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .sidebar {
    width: 100%;
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 900px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .search-input {
    width: 100%;
  }

  .main-content {
    padding: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .content-card,
  .header,
  .filter-section,
  .btn-primary,
  .btn-secondary {
    animation: none;
    transition: none;
  }
}
</style>
