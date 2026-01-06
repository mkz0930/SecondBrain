import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'

export const useTagStore = defineStore('tag', () => {
  const tags = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 获取标签列表
  async function fetchTags() {
    loading.value = true
    error.value = null
    try {
      const response = await api.get('/api/tags')
      tags.value = response.data.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to fetch tags:', err)
    } finally {
      loading.value = false
    }
  }

  // 创建标签
  async function createTag(data) {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/api/tags', data)
      await fetchTags()
      return response.data
    } catch (err) {
      error.value = err.message
      console.error('Failed to create tag:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag
  }
})
