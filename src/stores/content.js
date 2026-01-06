import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useContentStore = defineStore('content', () => {
  const contents = ref([])
  const currentContent = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 20
  })
  
  const filters = ref({
    type: '',
    tag: '',
    is_favorite: null,
    search: '',
    sort: 'created_at',
    order: 'desc'
  })

  // 获取内容列表
  async function fetchContents() {
    loading.value = true
    error.value = null
    try {
      const params = {
        ...filters.value,
        page: pagination.value.page,
        limit: pagination.value.limit
      }
      const response = await api.get('/api/contents', { params })
      contents.value = response.data.data
      pagination.value.total = response.data.total
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch contents:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取单个内容
  async function fetchContent(id) {
    loading.value = true
    error.value = null
    try {
      const response = await api.get(`/api/contents/${id}`)
      currentContent.value = response.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch content:', err)
    } finally {
      loading.value = false
    }
  }

  // 创建内容
  async function createContent(data) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/api/contents', data)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to create content:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 更新内容
  async function updateContent(id, data) {
    loading.value = true
    error.value = null
    try {
      const response = await api.put(`/api/contents/${id}`, data)
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to update content:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除内容
  async function deleteContent(id) {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/api/contents/${id}`)
      await fetchContents()
    } catch (err) {
      error.value = err.message
      console.error('Failed to delete content:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 切换收藏
  async function toggleFavorite(id) {
    try {
      const response = await api.post(`/api/contents/${id}/favorite`)
      if (currentContent.value && currentContent.value.id === id) {
        currentContent.value.is_favorite = response.data.is_favorite
      }
      await fetchContents()
    } catch (err) {
      error.value = err.message
      console.error('Failed to toggle favorite:', err)
      throw err
    }
  }

  // 记录访问
  async function recordAccess(id) {
    try {
      await api.post(`/api/contents/${id}/access`)
    } catch (err) {
      console.error('Failed to record access:', err)
    }
  }

  // 更新筛选条件
  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
    fetchContents()
  }

  // 更新分页
  function updatePage(page) {
    pagination.value.page = page
    fetchContents()
  }

  return {
    contents,
    currentContent,
    loading,
    error,
    pagination,
    filters,
    fetchContents,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
    toggleFavorite,
    recordAccess,
    updateFilters,
    updatePage
  }
})
