<template>
  <div class="detail-view">
    <div class="header">
      <button class="btn-default" @click="goBack">← 返回</button>
      <div class="actions">
        <button class="btn-primary" @click="goToEdit">编辑</button>
        <button class="btn-danger" @click="handleDelete">删除</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="content" class="content-detail">
      <div class="content-header">
        <h1>{{ content.title }}</h1>
        <button 
          class="favorite-btn"
          :class="{ active: content.is_favorite }"
          @click="toggleFavorite">
          {{ content.is_favorite ? '★' : '☆' }}
        </button>
      </div>

      <div class="content-meta">
        <span class="type-badge">{{ getTypeName(content.type) }}</span>
        <span class="rating" v-if="content.smart_rating !== null && content.smart_rating !== undefined">
          {{ '★'.repeat(content.smart_rating) }}{{ '☆'.repeat(5 - content.smart_rating) }}
        </span>
        <span class="access-count">访问 {{ content.access_count }} 次</span>
      </div>

      <div class="content-tags" v-if="content.tags && content.tags.length > 0">
        <span 
          v-for="tag in content.tags" 
          :key="tag.id"
          class="tag"
          :style="{ backgroundColor: tag.color || '#e4e7ed' }">
          {{ tag.name }}
        </span>
      </div>

      <div class="content-source" v-if="content.source">
        <strong>来源：</strong>{{ content.source }}
      </div>

      <div class="content-body">
        {{ content.content }}
      </div>

      <div class="content-footer">
        <span>创建时间：{{ formatDateTime(content.created_at) }}</span>
        <span>更新时间：{{ formatDateTime(content.updated_at) }}</span>
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

.actions {
  display: flex;
  gap: 12px;
}

.content-detail {
  max-width: 900px;
  margin: 40px auto;
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.content-header h1 {
  font-size: 32px;
  color: #333;
  margin: 0;
  flex: 1;
}

.favorite-btn {
  font-size: 32px;
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

.content-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.type-badge {
  display: inline-block;
  padding: 6px 16px;
  background-color: #e4e7ed;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

.rating {
  color: #ffd700;
  font-size: 16px;
}

.access-count {
  color: #909399;
  font-size: 14px;
}

.content-tags {
  margin-bottom: 20px;
}

.content-source {
  margin-bottom: 20px;
  padding: 12px;
  background-color: #f9f9f9;
  border-left: 3px solid #409eff;
  color: #606266;
}

.content-body {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 30px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.content-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  color: #909399;
  font-size: 14px;
}

.annotations-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 2px solid #f0f0f0;
}

.annotations-section h3 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
}

.annotation-item {
  background-color: #f9f9f9;
  border-left: 3px solid #67c23a;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.annotation-content {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.annotation-time {
  color: #909399;
  font-size: 12px;
}

.loading, .error {
  text-align: center;
  padding: 60px;
  font-size: 16px;
}

.error {
  color: #f56c6c;
}
</style>
