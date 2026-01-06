<template>
  <div class="home-view">
    <div class="header">
      <h1>外挂大脑系统</h1>
      <div class="header-actions">
        <input 
          v-model="searchKeyword" 
          type="text" 
          placeholder="搜索内容..." 
          @keyup.enter="handleSearch"
          class="search-input"
        />
        <button class="btn-primary" @click="goToNew">+ 新建内容</button>
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
              <span class="rating" v-if="content.rating">
                {{ '★'.repeat(content.rating) }}{{ '☆'.repeat(5 - content.rating) }}
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
import { formatDate, truncateText, getContentTypeName } from '../utils/helpers'

const router = useRouter()
const contentStore = useContentStore()
const tagStore = useTagStore()

const searchKeyword = ref('')

const contents = computed(() => contentStore.contents)
const loading = computed(() => contentStore.loading)
const error = computed(() => contentStore.error)
const pagination = computed(() => contentStore.pagination)
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
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  padding: 20px 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.main-content {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
}

.filter-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.filter-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.filter-item {
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: #606266;
}

.filter-item:hover {
  background-color: #f5f7fa;
}

.filter-item.active {
  background-color: #409eff;
  color: white;
}

.content-area {
  flex: 1;
  min-width: 0;
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
}

.error {
  color: #f56c6c;
}

.content-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.content-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-header h3 {
  font-size: 18px;
  color: #333;
  margin: 0;
  flex: 1;
}

.favorite-btn {
  font-size: 20px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #ddd;
  transition: color 0.2s;
}

.favorite-btn.active,
.favorite-btn:hover {
  color: #ffd700;
}

.card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #e4e7ed;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.rating {
  color: #ffd700;
  font-size: 14px;
}

.card-content {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
  min-height: 60px;
}

.card-tags {
  margin-bottom: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #909399;
  font-size: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
