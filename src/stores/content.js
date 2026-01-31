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
    sort: 'updated_at',
    order: 'desc'
  })

  // 获取内容列表
  async function fetchContents(append = false) {
    loading.value = true
    error.value = null
    try {
      const params = {
        ...filters.value,
        page: pagination.value.page,
        limit: pagination.value.limit
      }
      const response = await api.get('/api/contents', { params })
      
      if (append) {
        // 去重合并，防止重复key
        const newItems = (response.data.data || []).filter(item => 
          !contents.value.some(existing => existing.id === item.id)
        )
        contents.value = [...contents.value, ...newItems]
      } else {
        contents.value = response.data.data || []
      }
      
      pagination.value.total = response.data.total
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch contents:', err)
    } finally {
      loading.value = false
    }
  }

  // 加载更多
  async function loadMore() {
    const totalPages = Math.ceil(pagination.value.total / pagination.value.limit)
    if (pagination.value.page < totalPages) {
      pagination.value.page++
      await fetchContents(true)
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
      // 使用宽松比较或统一转换为字符串，因为id可能是路由参数(string)
      if (currentContent.value && String(currentContent.value.id) === String(id)) {
        currentContent.value.is_favorite = response.data.is_favorite
      }
      
      // 同时更新列表中的状态，避免重新fetch带来的闪烁
      const listItem = contents.value.find(c => String(c.id) === String(id))
      if (listItem) {
        listItem.is_favorite = response.data.is_favorite
      }

      // 可选：仍然重新fetch以确保完全同步，或者依赖上面的本地更新
      // await fetchContents() 
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

  // 重新分析内容（支持图片分析）
  async function reanalyzeContent(id) {
    try {
      const response = await api.post(`/api/contents/${id}/reanalyze`)
      return response.data
    } catch (err) {
      console.error('Failed to reanalyze content:', err)
      throw err
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
    reanalyzeContent,
    updateFilters,
    updatePage,
    loadMore
  }
})
