<template>
  <div class="edit-view">
    <div class="header">
      <button class="btn-default" @click="goBack">← 返回首页</button>
      <div class="actions">
        <button class="btn-default" @click="goBack">取消</button>
        <button class="btn-primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="form-container">
      <h1>{{ isEditMode ? '编辑内容' : '新建内容' }}</h1>

      <form @submit.prevent="handleSave" class="content-form">
        <div class="form-group">
          <label>类型 <span class="required">*</span></label>
          <select v-model="formData.type" required>
            <option value="">请选择类型</option>
            <option value="note">随笔</option>
            <option value="article">文章</option>
            <option value="media">音视频</option>
            <option value="book">书籍</option>
          </select>
        </div>

        <div class="form-group">
          <label>标题 <span class="required">*</span></label>
          <input 
            v-model="formData.title" 
            type="text" 
            placeholder="请输入标题"
            maxlength="200"
            required
          />
        </div>

        <div class="form-group">
          <label>内容</label>
          <textarea 
            v-model="formData.content" 
            placeholder="请输入内容"
            rows="15"
          ></textarea>
        </div>

        <div class="form-group">
          <label>来源</label>
          <input 
            v-model="formData.source" 
            type="text" 
            placeholder="URL、书名等"
            maxlength="500"
          />
        </div>

        <div class="form-group">
          <label>评分</label>
          <div class="rating-selector">
            <span 
              v-for="star in 5" 
              :key="star"
              class="star"
              :class="{ active: formData.rating >= star }"
              @click="formData.rating = star">
              ★
            </span>
            <button type="button" class="clear-rating" @click="formData.rating = null">清除评分</button>
          </div>
        </div>

        <div class="form-group">
          <label>标签</label>
          <div class="tag-selector">
            <div class="selected-tags">
              <span
                v-for="tagId in formData.tags"
                :key="tagId"
                class="tag"
                :style="{ backgroundColor: getTagColor(tagId) }">
                {{ getTagName(tagId) }}
                <button type="button" @click="removeTag(tagId)">×</button>
              </span>
            </div>
            <div class="tag-input">
              <select v-model="selectedTagId" @change="addTag">
                <option value="">选择标签</option>
                <option
                  v-for="tag in availableTags"
                  :key="tag.id"
                  :value="tag.id">
                  {{ tag.name }}
                </option>
              </select>
              <button type="button" class="btn-default" @click="showNewTagInput = true">
                + 新建标签
              </button>
            </div>
            <div v-if="showNewTagInput" class="new-tag-input">
              <input
                v-model="newTagName"
                type="text"
                placeholder="标签名称"
                @keyup="handleNewTagKeyup"
              />
              <input
                v-model="newTagColor"
                type="color"
              />
              <button type="button" class="btn-primary" @click="createNewTag">创建</button>
              <button type="button" class="btn-default" @click="cancelNewTag">取消</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>附件</label>
          <div class="attachment-section">
            <div class="attachment-list" v-if="formData.attachments && formData.attachments.length > 0">
              <div v-for="(attachment, index) in formData.attachments" :key="index" class="attachment-item">
                <span class="attachment-icon">{{ getAttachmentIcon(attachment) }}</span>
                <span class="attachment-name">{{ attachment.name }}</span>
                <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                <button type="button" class="btn-remove" @click="removeAttachment(index)">×</button>
              </div>
            </div>
            <div class="upload-area">
              <input
                type="file"
                ref="fileInput"
                @change="handleFileSelect"
                multiple
                style="display: none"
              />
              <button type="button" class="btn-default" @click="$refs.fileInput.click()">
                📎 选择文件
              </button>
              <span class="upload-hint">支持图片、文档、音视频等，单个文件最大 50MB</span>
            </div>
            <div v-if="uploading" class="upload-progress">
              上传中... {{ uploadProgress }}
            </div>
          </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useContentStore } from '../stores/content'
import { useTagStore } from '../stores/tag'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const contentStore = useContentStore()
const tagStore = useTagStore()

const isEditMode = computed(() => route.params.id !== undefined && route.name === 'ContentEdit')
const saving = ref(false)
const error = ref(null)
const uploading = ref(false)
const uploadProgress = ref('')
const fileInput = ref(null)

const formData = ref({
  type: '',
  title: '',
  content: '',
  source: '',
  rating: null,
  tags: [],
  attachments: []
})

const selectedTagId = ref('')
const showNewTagInput = ref(false)
const newTagName = ref('')
const newTagColor = ref('#409eff')

const availableTags = computed(() => {
  return tagStore.tags.filter(tag => !formData.value.tags.includes(tag.id))
})

onMounted(async () => {
  await tagStore.fetchTags()

  if (isEditMode.value) {
    await contentStore.fetchContent(route.params.id)
    const content = contentStore.currentContent
    if (content) {
      // Parse attachments from database
      let attachments = []
      if (content.attachments) {
        try {
          attachments = typeof content.attachments === 'string'
            ? JSON.parse(content.attachments)
            : content.attachments
        } catch (e) {
          console.error('Failed to parse attachments:', e)
        }
      }

      formData.value = {
        type: content.type,
        title: content.title,
        content: content.content || '',
        summary: content.summary || '',
        source: content.source || '',
        rating: content.rating || null,
        tags: content.tags ? content.tags.map(t => t.id) : [],
        attachments: Array.isArray(attachments) ? attachments : []
      }
    }
  }
})

function goBack() {
  router.back()
}

async function handleFileSelect(event) {
  const files = event.target.files
  if (!files || files.length === 0) return

  uploading.value = true
  uploadProgress.value = '准备上传...'
  error.value = null

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      uploadProgress.value = `上传 ${i + 1}/${files.length}: ${file.name}`

      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post('/api/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Add uploaded file info to attachments
      if (!formData.value.attachments) {
        formData.value.attachments = []
      }
      formData.value.attachments.push(response.data)
    }

    uploadProgress.value = '上传完成'
    // Clear file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (err) {
    error.value = '上传失败：' + (err.response?.data?.error || err.message)
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.value = ''
    }, 2000)
  }
}

function removeAttachment(index) {
  formData.value.attachments.splice(index, 1)
}

function getAttachmentIcon(attachment) {
  if (!attachment) return '📎'
  const name = attachment.name || ''
  const type = attachment.type || ''

  if (type.startsWith('image/') || /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(name)) return '🖼️'
  if (/\.(pdf)$/i.test(name)) return '📄'
  if (/\.(doc|docx)$/i.test(name)) return '📝'
  if (/\.(xls|xlsx)$/i.test(name)) return '📊'
  if (/\.(ppt|pptx)$/i.test(name)) return '📽️'
  if (/\.(zip|rar|7z)$/i.test(name)) return '📦'
  if (/\.(mp3|wav)$/i.test(name) || type.startsWith('audio/')) return '🎵'
  if (/\.(mp4|avi|mov)$/i.test(name) || type.startsWith('video/')) return '🎬'
  return '📎'
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

async function handleSave() {
  if (!formData.value.type || !formData.value.title) {
    error.value = '请填写必填项'
    return
  }

  saving.value = true
  error.value = null

  try {
    if (isEditMode.value) {
      const result = await contentStore.updateContent(route.params.id, formData.value)

      // 如果内容被优化了，重新获取数据以显示优化后的内容
      if (result.optimized) {
        await contentStore.fetchContent(route.params.id)
      }

      router.push(`/content/${route.params.id}`)
    } else {
      const result = await contentStore.createContent(formData.value)
      router.push(`/content/${result.id}`)
    }
  } catch (err) {
    error.value = '保存失败：' + err.message
  } finally {
    saving.value = false
  }
}

function addTag() {
  if (selectedTagId.value && !formData.value.tags.includes(selectedTagId.value)) {
    formData.value.tags.push(parseInt(selectedTagId.value))
  }
  selectedTagId.value = ''
}

function removeTag(tagId) {
  formData.value.tags = formData.value.tags.filter(id => id !== tagId)
}

function getTagName(tagId) {
  const tag = tagStore.tags.find(t => t.id === tagId)
  return tag ? tag.name : ''
}

function getTagColor(tagId) {
  const tag = tagStore.tags.find(t => t.id === tagId)
  return tag && tag.color ? tag.color : '#e4e7ed'
}

async function createNewTag() {
  if (!newTagName.value) {
    alert('请输入标签名称')
    return
  }

  try {
    const result = await tagStore.createTag({
      name: newTagName.value,
      color: newTagColor.value
    })
    formData.value.tags.push(result.id)
    newTagName.value = ''
    newTagColor.value = '#409eff'
    showNewTagInput.value = false
  } catch (err) {
    alert('创建标签失败：' + err.message)
  }
}

function handleNewTagKeyup(e) {
  if (e.key === 'Enter') {
    createNewTag()
  }
}

function cancelNewTag() {
  newTagName.value = ''
  newTagColor.value = '#409eff'
  showNewTagInput.value = false
}
</script>

<style scoped>
.edit-view {
  min-height: 100vh;
  background-color: var(--bg-body);
}

.header {
  background: rgba(26, 29, 36, 0.8);
  backdrop-filter: blur(12px);
  padding: 20px 40px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header .actions {
  display: flex;
  gap: 12px;
}

.form-container {
  max-width: 900px;
  margin: 40px auto;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.form-container h1 {
  font-size: 28px;
  color: var(--text-primary);
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.content-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 14px;
}

.required {
  color: var(--danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
  background-color: var(--bg-surface);
  color: var(--text-primary);
}

.rating-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.star {
  font-size: 28px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
}

.star.active,
.star:hover {
  color: var(--warning);
}

.clear-rating {
  margin-left: 12px;
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  color: var(--text-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.clear-rating:hover {
  color: var(--text-primary);
  border-color: var(--text-primary);
}

.tag-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.selected-tags .tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  color: #1a1d24; /* Dark text for light tags */
  font-size: 13px;
}

.selected-tags .tag button {
  background: none;
  border: none;
  color: #1a1d24;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0.6;
}

.selected-tags .tag button:hover {
  opacity: 1;
}

.tag-input {
  display: flex;
  gap: 12px;
}

.tag-input select {
  flex: 1;
}

.new-tag-input {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-surface-hover);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.new-tag-input input[type="text"] {
  flex: 1;
}

.new-tag-input input[type="color"] {
  width: 60px;
  height: 40px;
  padding: 2px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  cursor: pointer;
}

.error-message {
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: var(--danger);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.attachment-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-surface-hover);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.attachment-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.attachment-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 20px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
}

.btn-remove:hover {
  color: var(--danger);
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.upload-progress {
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
  color: var(--accent-primary);
  font-size: 13px;
}
</style>
