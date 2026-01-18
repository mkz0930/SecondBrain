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

          <!-- 封面图 -->
          <div class="info-card image-card" v-if="coverImage">
            <img :src="coverImage" alt="Cover" class="cover-image" />
          </div>

          <!-- 详细信息 -->
          <div class="info-card">
            <div class="card-title">详细信息</div>
            <div class="meta-list">
              <div class="meta-item" v-if="manualRating > 0">
                <span class="label">我的评分:</span>
                <span class="value rating-stars">{{ '★'.repeat(manualRating) }}{{ '☆'.repeat(5 - manualRating) }}</span>
              </div>
              <div class="meta-item">
                <span class="label">字数统计:</span>
                <span class="value">{{ wordCount }} 字</span>
              </div>
              <div class="meta-item">
                <span class="label">预计阅读:</span>
                <span class="value">{{ readingTime }} 分钟</span>
              </div>
            </div>
          </div>


          
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
          <div class="info-card">
            <div class="card-title">来源信息</div>
            <div class="sidebar-source-list" v-if="content.url || content.source">
              <div v-if="content.source" class="sidebar-source-item">
                 <div class="source-label">来源:</div>
                 <div class="source-value">{{ content.source }}</div>
               </div>
               <div v-if="content.url" class="sidebar-source-item">
                 <div class="source-label">链接:</div>
                 <a :href="content.url" target="_blank" class="sidebar-url-link">
                   <span class="link-icon">🔗</span>
                   <span class="link-text">{{ content.url }}</span>
                 </a>
               </div>
            </div>
            <div v-else class="empty-url-state">
              暂无来源信息
            </div>
          </div>


        </aside>

        <!-- 右侧正文区域 -->
        <main class="main-body-panel">
          <!-- Markdown 渲染内容 -->
          <div class="content-body" v-html="renderedContent"></div>

          <div class="content-footer">
            <span>最后更新：{{ formatDateTime(content.updated_at) }}</span>
          </div>

          <!-- 正文内容 (元数据) -->
          <div class="detail-section">
            <h3>来源信息</h3>
            <div class="source-list" v-if="content.url || content.source">
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
            <div v-else class="empty-state">
              暂无来源信息
            </div>
          </div>

          <!-- 附件列表 -->
          <div class="detail-section">
            <h3>附件 ({{ attachments.length }})</h3>
            <div class="attachments-list" v-if="attachments.length > 0">
              <div v-for="(item, index) in attachments" :key="index" class="attachment-item">
                <a :href="item.url" target="_blank" class="attachment-link" :title="item.url">
                  <span class="attachment-icon">{{ item.type === 'image' ? '🖼️' : '📎' }}</span>
                  <span class="attachment-name">{{ item.name }}</span>
                </a>
                <div v-if="item.type === 'image'" class="attachment-preview-box">
                  <img :src="item.url" loading="lazy" />
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              暂无附件
            </div>
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
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

const router = useRouter()
const route = useRoute()
const contentStore = useContentStore()

const content = computed(() => contentStore.currentContent)
const loading = computed(() => contentStore.loading)
const error = computed(() => contentStore.error)

// Markdown 渲染内容
const renderedContent = computed(() => {
  if (!content.value || !content.value.content) return ''
  return md.render(content.value.content)
})

const coverImage = computed(() => {
  if (!content.value) return null
  const text = content.value.content || ''
  // Markdown image
  const mdMatch = text.match(/!\[.*?\]\((.*?)\)/)
  if (mdMatch) return mdMatch[1]
  // HTML image
  const htmlMatch = text.match(/<img.*?src=["'](.*?)["']/)
  if (htmlMatch) return htmlMatch[1]
  // URL is image
  if (content.value.url && /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(content.value.url)) {
    return content.value.url
  }
  return null
})

const wordCount = computed(() => {
  return (content.value?.content || '').length
})

const readingTime = computed(() => {
  return Math.ceil(wordCount.value / 500) || 1
})

const manualRating = computed(() => content.value?.rating || 0)

const attachments = computed(() => {
  if (!content.value) return []
  const text = content.value.content || ''
  const items = []
  const seenUrls = new Set()

  const addItem = (type, name, url) => {
    if (!url || seenUrls.has(url)) return
    seenUrls.add(url)
    items.push({ type, name, url })
  }

  // 1. Extract Markdown images
  const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g
  let match
  while ((match = mdImgRegex.exec(text)) !== null) {
    addItem('image', match[1] || '图片', match[2])
  }

  // 2. Extract HTML images
  const htmlImgRegex = /<img[^>]+src=["'](.*?)["'][^>]*>/g
  while ((match = htmlImgRegex.exec(text)) !== null) {
    const altMatch = match[0].match(/alt=["'](.*?)["']/)
    const name = altMatch ? altMatch[1] : '图片'
    addItem('image', name, match[1])
  }

  // 3. Extract potential file links
  const mdLinkRegex = /(?<!!)\[(.*?)\]\((.*?)\)/g
  while ((match = mdLinkRegex.exec(text)) !== null) {
    const url = match[2]
    // Only treat as attachment if it looks like a file
    if (isAttachmentUrl(url)) {
      addItem('file', match[1] || '文件', url)
    }
  }

  // 4. Extract plain text URLs
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1]
    // Check if it's an image url
    if (isImageUrl(url)) {
      addItem('image', '图片', url)
    } else if (isAttachmentUrl(url)) {
      // It's a file link
      addItem('file', '文件', url)
    }
  }

  return items
})

function isImageUrl(url) {
  return /\.(jpeg|jpg|gif|png|webp|bmp|svg)($|\?)/i.test(url)
}

function isAttachmentUrl(url) {
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|csv|md|mp3|mp4|wav|avi|mov)($|\?)/i.test(url)
}

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

.sidebar-url-link {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: var(--accent-primary);
  text-decoration: none;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
  transition: opacity 0.2s;
}

.sidebar-url-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.link-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.empty-url-state {
  color: var(--text-tertiary);
  font-size: 13px;
  font-style: italic;
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

/* Markdown Content Styles */
.content-body {
  font-size: 17px;
  line-height: 1.8;
  color: var(--text-primary);
  word-wrap: break-word;
}

.content-body :deep(h1),
.content-body :deep(h2),
.content-body :deep(h3),
.content-body :deep(h4),
.content-body :deep(h5),
.content-body :deep(h6) {
  color: var(--text-primary);
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  line-height: 1.3;
  font-weight: 600;
}

.content-body :deep(h1) { font-size: 1.8em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
.content-body :deep(h2) { font-size: 1.5em; }
.content-body :deep(h3) { font-size: 1.25em; }

.content-body :deep(p) {
  margin-bottom: 1.2em;
}

.content-body :deep(ul),
.content-body :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 1.2em;
}

.content-body :deep(li) {
  margin-bottom: 0.4em;
}

.content-body :deep(blockquote) {
  border-left: 4px solid var(--accent-primary);
  margin: 0 0 1.2em 0;
  padding: 0.8em 1.2em;
  background: rgba(59, 130, 246, 0.05);
  color: var(--text-secondary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.content-body :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  color: var(--accent-secondary);
}

.content-body :deep(pre) {
  background: #1e1e1e;
  padding: 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1.5em;
  border: 1px solid var(--border-color);
}

.content-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #e4e7ed;
  font-size: 0.9em;
}

.content-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 1.2em 0;
  box-shadow: var(--shadow-sm);
}

.content-body :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
  border-bottom: 1px dashed var(--accent-primary);
}

.content-body :deep(a:hover) {
  border-bottom-style: solid;
}

.content-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 2em 0;
}

.content-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5em;
}

.content-body :deep(th),
.content-body :deep(td) {
  border: 1px solid var(--border-color);
  padding: 0.8em;
  text-align: left;
}

.content-body :deep(th) {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: var(--text-secondary);
}

.content-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: right;
}

.detail-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
}

.detail-section h3 {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.empty-state {
  color: var(--text-tertiary);
  font-size: 14px;
  padding: 12px 0;
  font-style: italic;
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

.image-card {
  padding: 0;
  overflow: hidden;
  border: none;
}

.cover-image {
  width: 100%;
  height: auto;
  max-height: 300px;
  display: block;
  object-fit: cover;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.meta-item .label {
  color: var(--text-tertiary);
}

.meta-item .value {
  color: var(--text-secondary);
  font-weight: 500;
}

.rating-stars {
  color: var(--warning);
  letter-spacing: 2px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attachment-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border-color);
}

.attachment-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.attachment-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 14px;
  transition: color 0.2s;
}

.attachment-link:hover {
  color: var(--accent-primary);
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-preview-box {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-body);
}

.attachment-preview-box img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 150px;
  object-fit: cover;
}

.sidebar-source-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-source-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.source-label {
  color: var(--text-tertiary);
  font-size: 12px;
}

.source-value {
  color: var(--text-secondary);
  font-size: 13px;
  word-break: break-all;
  line-height: 1.5;
}
</style>