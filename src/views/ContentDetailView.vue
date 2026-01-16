<template>
  <div class="detail-view">
    <div class="header">
      <button class="btn-default back-btn" @click="goBack">
        <span class="icon">←</span> 返回
      </button>
      <div class="actions">
        <button class="btn-primary" @click="goToEdit">编辑</button>
        <button class="btn-danger" @click="handleDelete">删除</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="content" class="content-container">
      
      <!-- 顶部标题区域 -->
      <div class="content-header-section">
        <div class="title-row">
          <h1>{{ content.title }}</h1>
          <button 
            class="favorite-btn"
            :class="{ active: content.is_favorite }"
            @click="toggleFavorite"
            title="收藏">
            {{ content.is_favorite ? '★' : '☆' }}
          </button>
        </div>

        <div class="meta-row">
          <span class="type-badge">{{ getTypeName(content.type) }}</span>
          <span class="rating" v-if="content.smart_rating !== null && content.smart_rating !== undefined">
            {{ '★'.repeat(content.smart_rating) }}{{ '☆'.repeat(5 - content.smart_rating) }}
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-text">{{ formatDateTime(content.created_at) }}</span>
          <span class="meta-separator">•</span>
          <span class="meta-text">访问 {{ content.access_count }} 次</span>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="content-grid">
        <!-- 左侧信息栏 -->
        <aside class="info-panel">
          
          <!-- AI 摘要 -->
          <div class="info-card summary-card" v-if="content.summary">
            <div class="card-title">
              <span class="icon">✦</span> AI 智能摘要
            </div>
            <div class="summary-text">{{ content.summary }}</div>
          </div>

          <!-- 标签 -->
          <div class="info-card" v-if="content.tags && content.tags.length > 0">
            <div class="card-title">标签</div>
            <div class="tags-list">
              <span 
                v-for="tag in content.tags" 
                :key="tag.id"
                class="tag"
                :style="{ backgroundColor: tag.color || '#e4e7ed', color: '#1a1d24' }">
                {{ tag.name }}
              </span>
            </div>
          </div>

          <!-- 来源信息 -->
          <div class="info-card" v-if="content.url || content.source">
            <div class="card-title">来源信息</div>
            <div class="source-list">
              <div v-if="content.source" class="source-item">
                <span class="label">来源:</span>
                <span class="value">{{ content.source }}</span>
              </div>
              <div v-if="content.url" class="source-item">
                <span class="label">链接:</span>
                <a :href="content.url" target="_blank" rel="noopener noreferrer" class="link">
                  访问链接 ↗
                </a>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧正文区域 -->
        <main class="main-body-panel">
          <div class="content-body">
            {{ content.content }}
          </div>

          <div class="content-footer">
            <span>最后更新：{{ formatDateTime(content.updated_at) }}</span>
          </div>

          <div class="annotations-section" v-if="content.annotations && content.annotations.length > 0">
            <h3>批注</h3>
            <div 
              v-for="annotation in content.annotations" 
              :key="annotation.id"
              class="annotation-item">
              <div class="annotation-content">{{ annotation.note }}</div>
              <div class="annotation-time">{{ formatDateTime(annotation.created_at) }}</div>
            </div>
          </div>
        </main>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useContentStore } from '../stores/content'
import { formatDateTime, getContentTypeName } from '../utils/helpers'

const router = useRouter()
const route = useRoute()
const contentStore = useContentStore()

const content = computed(() => contentStore.currentContent)
const loading = computed(() => contentStore.loading)
const error = computed(() => contentStore.error)

onMounted(async () => {
  const id = route.params.id
  await contentStore.fetchContent(id)
  await contentStore.recordAccess(id)
})

function goBack() {
  router.push('/')
}

function goToEdit() {
  router.push(`/content/${route.params.id}/edit`)
}

async function handleDelete() {
  if (!confirm('确定要删除这条内容吗？')) {
    return
  }

  try {
    await contentStore.deleteContent(route.params.id)
    router.push('/')
  } catch (err) {
    alert('删除失败')
  }
}

async function toggleFavorite() {
  try {
    await contentStore.toggleFavorite(route.params.id)
  } catch (err) {
    alert('切换收藏失败')
  }
}

function getTypeName(type) {
  return getContentTypeName(type)
}
</script>

<style scoped>
.detail-view {
  min-height: 100vh;
  background-color: var(--bg-body);
  padding-bottom: 40px;
}

.header {
  background: rgba(26, 29, 36, 0.8);
  backdrop-filter: blur(12px);
  padding: 16px 40px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.actions {
  display: flex;
  gap: 12px;
}

.content-container {
  max-width: 1200px;
  margin: 32px auto;
  padding: 0 40px;
  animation: fadeIn 0.4s ease;
}

.content-header-section {
  margin-bottom: 32px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 16px;
}

.title-row h1 {
  font-size: 32px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
  flex: 1;
}

.favorite-btn {
  font-size: 28px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: transform 0.2s, color 0.2s;
  flex-shrink: 0;
}

.favorite-btn.active,
.favorite-btn:hover {
  color: var(--warning);
  transform: scale(1.1);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-size: 14px;
}

.type-badge {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-weight: 500;
  font-size: 13px;
}

.rating {
  color: var(--warning);
  letter-spacing: 1px;
}

.meta-separator {
  color: var(--border-color);
}

/* Grid Layout */
.content-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 32px;
  align-items: start;
}

/* Info Panel */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-card {
  background: linear-gradient(145deg, var(--bg-surface), var(--bg-surface-hover));
  border-left: 4px solid var(--accent-secondary);
}

.summary-card .card-title {
  color: var(--accent-secondary);
}

.summary-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
  text-align: justify;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  color: #1a1d24; /* Dark text for light tags */
  background: var(--text-primary);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.source-item .label {
  color: var(--text-tertiary);
  font-size: 12px;
}

.source-item .value {
  color: var(--text-secondary);
  word-break: break-all;
}

.link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.link:hover {
  text-decoration: underline;
}

/* Main Body Panel */
.main-body-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  min-height: 400px;
}

.content-body {
  font-size: 17px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: right;
}

.annotations-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px dashed var(--border-color);
}

.annotations-section h3 {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.annotation-item {
  background: rgba(16, 185, 129, 0.1);
  border-left: 4px solid var(--success);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.annotation-content {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.annotation-time {
  font-size: 12px;
  color: var(--success);
  opacity: 0.8;
}

.loading, .error {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}

.error {
  color: var(--danger);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .info-panel {
    order: 2;
  }
  
  .main-body-panel {
    order: 1;
    padding: 24px;
  }

  .content-container {
    padding: 0 20px;
    margin: 20px auto;
  }
  
  .header {
    padding: 16px 20px;
  }
}
</style>
