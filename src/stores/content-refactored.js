import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'
import { useAsyncState, usePagination, useListState, useFilterState } from '../utils/store-helpers'
import { createCrudApi, handleApiError } from '../utils/api-helpers'

const contentApi = createCrudApi('/api/contents')

export const useContentStore = defineStore('content', () => {
  // 使用辅助工具管理状态
  const { loading, error, execute, clearError } = useAsyncState()
  const { items: contents, setItems, addItem, updateItem, removeItem, findItem } = useListState()
  const { page, limit, total, totalPages, hasNextPage, goToPage, reset: resetPagination, updateTotal } = usePagination(20)
  const { filters, setFilter, setFilters, clearFilter, getFilters } = useFilterState()

  // 当前内容
  const currentContent = ref(null)

  // 初始化筛选条件
  setFilters({
    type: '',
    tag: '',
    is_favorite: null,
    search: '',
    sort: 'updated_at',
    order: 'desc'
  })

  /**
   * 获取内容列表
   * @param {boolean} append - 是否追加到现有列表
   */
  async function fetchContents(append = false) {
    return execute(async () => {
      const params = {
        ...getFilters(),
        page: page.value,
        limit: limit.value
      }

      const response = await contentApi.getList(params)

      if (append) {
        // 去重合并
        const newItems = (response.data || []).filter(item =>
          !contents.value.some(existing => existing.id === item.id)
        )
        setItems([...contents.value, ...newItems])
      } else {
        setItems(response.data || [])
      }

      updateTotal(response.pagination?.total || response.total || 0)
      return response
    })
  }

  /**
   * 加载更多
   */
  async function loadMore() {
    if (hasNextPage.value) {
      page.value++
      await fetchContents(true)
    }
  }

  /**
   * 获取单个内容
   * @param {number|string} id - 内容 ID
   */
  async function fetchContent(id) {
    return execute(async () => {
      const response = await contentApi.getOne(id)
      currentContent.value = response.data || response
      return currentContent.value
    })
  }

  /**
   * 创建内容
   * @param {Object} data - 内容数据
   */
  async function createContent(data) {
    return execute(async () => {
      const response = await contentApi.create(data)
      // 创建成功后，添加到列表开头
      if (response.data) {
        addItem(response.data)
      }
      return response
    })
  }

  /**
   * 更新内容
   * @param {number|string} id - 内容 ID
   * @param {Object} data - 更新数据
   */
  async function updateContent(id, data) {
    return execute(async () => {
      const response = await contentApi.update(id, data)

      // 更新当前内容
      if (currentContent.value && String(currentContent.value.id) === String(id)) {
        currentContent.value = { ...currentContent.value, ...data }
      }

      // 更新列表中的内容
      updateItem(id, data)

      return response
    })
  }

  /**
   * 删除内容
   * @param {number|string} id - 内容 ID
   */
  async function deleteContent(id) {
    return execute(async () => {
      await contentApi.delete(id)

      // 从列表中移除
      removeItem(id)

      // 清除当前内容
      if (currentContent.value && String(currentContent.value.id) === String(id)) {
        currentContent.value = null
      }
    })
  }

  /**
   * 切换收藏状态
   * @param {number|string} id - 内容 ID
   */
  async function toggleFavorite(id) {
    try {
      const response = await api.post(`/api/contents/${id}/favorite`)
      const newFavoriteStatus = response.data.data?.is_favorite ?? response.data.is_favorite

      // 更新当前内容
      if (currentContent.value && String(currentContent.value.id) === String(id)) {
        currentContent.value.is_favorite = newFavoriteStatus
      }

      // 更新列表中的状态
      updateItem(id, { is_favorite: newFavoriteStatus })

      return newFavoriteStatus
    } catch (err) {
      const errorMsg = handleApiError(err, '切换收藏失败')
      error.value = errorMsg
      throw new Error(errorMsg)
    }
  }

  /**
   * 记录访问
   * @param {number|string} id - 内容 ID
   */
  async function recordAccess(id) {
    try {
      await api.post(`/api/contents/${id}/access`)
    } catch (err) {
      console.error('Failed to record access:', err)
      // 访问记录失败不影响主流程
    }
  }

  /**
   * 分析内容（AI）
   * @param {string} content - 内容文本
   */
  async function analyzeContent(content) {
    return execute(async () => {
      const response = await api.post('/api/contents/analyze', { content })
      return response.data.data || response.data
    })
  }

  /**
   * 获取并解析 URL
   * @param {string} url - URL 地址
   */
  async function fetchUrl(url) {
    return execute(async () => {
      const response = await api.post('/api/contents/fetch-url', { url })
      return response.data.data || response.data
    })
  }

  /**
   * 快速保存
   * @param {string} url - URL 地址
   */
  async function quickSave(url) {
    return execute(async () => {
      const response = await api.post('/api/contents/quick-save', { url })
      const savedContent = response.data.data || response.data

      // 添加到列表开头
      if (savedContent.id) {
        addItem(savedContent)
      }

      return savedContent
    })
  }

  /**
   * 批量保存
   * @param {Array<Object>} items - 要保存的项列表
   */
  async function batchSave(items) {
    return execute(async () => {
      const response = await api.post('/api/contents/batch', { items })
      return response.data.data || response.data
    })
  }

  /**
   * 更新筛选条件
   * @param {Object} newFilters - 新的筛选条件
   */
  function updateFilters(newFilters) {
    setFilters({ ...getFilters(), ...newFilters })
    resetPagination()
    fetchContents()
  }

  /**
   * 更新单个筛选条件
   * @param {string} key - 筛选键
   * @param {*} value - 筛选值
   */
  function updateFilter(key, value) {
    setFilter(key, value)
    resetPagination()
    fetchContents()
  }

  /**
   * 清除筛选条件
   */
  function clearFilters() {
    clearFilter()
    resetPagination()
    fetchContents()
  }

  /**
   * 更新分页
   * @param {number} newPage - 新的页码
   */
  function updatePage(newPage) {
    goToPage(newPage)
    fetchContents()
  }

  /**
   * 搜索内容
   * @param {string} keyword - 搜索关键词
   */
  function search(keyword) {
    updateFilter('search', keyword)
  }

  /**
   * 按类型筛选
   * @param {string} type - 内容类型
   */
  function filterByType(type) {
    updateFilter('type', type)
  }

  /**
   * 按标签筛选
   * @param {string} tag - 标签名称
   */
  function filterByTag(tag) {
    updateFilter('tag', tag)
  }

  /**
   * 按收藏筛选
   * @param {boolean} isFavorite - 是否收藏
   */
  function filterByFavorite(isFavorite) {
    updateFilter('is_favorite', isFavorite)
  }

  /**
   * 排序
   * @param {string} sort - 排序字段
   * @param {string} order - 排序方向
   */
  function sortBy(sort, order = 'desc') {
    updateFilters({ sort, order })
  }

  /**
   * 重置所有状态
   */
  function reset() {
    setItems([])
    currentContent.value = null
    clearFilters()
    resetPagination()
    clearError()
  }

  return {
    // 状态
    contents,
    currentContent,
    loading,
    error,
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    filters,

    // 方法
    fetchContents,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
    toggleFavorite,
    recordAccess,
    analyzeContent,
    fetchUrl,
    quickSave,
    batchSave,
    loadMore,
    updateFilters,
    updateFilter,
    clearFilters,
    updatePage,
    search,
    filterByType,
    filterByTag,
    filterByFavorite,
    sortBy,
    reset,
    clearError
  }
})
