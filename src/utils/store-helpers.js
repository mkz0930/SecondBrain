/**
 * 前端 Pinia Store 基础工具
 * 提供可复用的 store 功能
 */

import { ref, computed } from 'vue'

/**
 * 创建异步状态管理
 * @returns {Object} 包含 loading, error 状态和辅助方法
 */
export function useAsyncState() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * 包装异步函数，自动管理 loading 和 error 状态
   * @param {Function} asyncFn - 异步函数
   * @returns {Promise<*>} 异步函数的返回值
   */
  async function execute(asyncFn) {
    loading.value = true
    error.value = null

    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '操作失败'
      console.error('Async operation failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除错误状态
   */
  function clearError() {
    error.value = null
  }

  return {
    loading,
    error,
    execute,
    clearError
  }
}

/**
 * 创建分页状态管理
 * @param {number} initialLimit - 初始每页数量
 * @returns {Object} 包含分页状态和方法
 */
export function usePagination(initialLimit = 20) {
  const page = ref(1)
  const limit = ref(initialLimit)
  const total = ref(0)

  /**
   * 计算总页数
   */
  const totalPages = computed(() => {
    return Math.ceil(total.value / limit.value)
  })

  /**
   * 是否有下一页
   */
  const hasNextPage = computed(() => {
    return page.value < totalPages.value
  })

  /**
   * 是否有上一页
   */
  const hasPrevPage = computed(() => {
    return page.value > 1
  })

  /**
   * 跳转到指定页
   * @param {number} newPage - 页码
   */
  function goToPage(newPage) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
    }
  }

  /**
   * 下一页
   */
  function nextPage() {
    if (hasNextPage.value) {
      page.value++
    }
  }

  /**
   * 上一页
   */
  function prevPage() {
    if (hasPrevPage.value) {
      page.value--
    }
  }

  /**
   * 重置到第一页
   */
  function reset() {
    page.value = 1
  }

  /**
   * 更新总数
   * @param {number} newTotal - 新的总数
   */
  function updateTotal(newTotal) {
    total.value = newTotal
  }

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    reset,
    updateTotal
  }
}

/**
 * 创建列表状态管理
 * @returns {Object} 包含列表状态和方法
 */
export function useListState() {
  const items = ref([])
  const selectedIds = ref(new Set())

  /**
   * 设置列表项
   * @param {Array} newItems - 新的列表项
   */
  function setItems(newItems) {
    items.value = newItems
  }

  /**
   * 添加列表项
   * @param {*} item - 要添加的项
   */
  function addItem(item) {
    items.value.unshift(item)
  }

  /**
   * 更新列表项
   * @param {number|string} id - 项的 ID
   * @param {Object} updates - 要更新的字段
   */
  function updateItem(id, updates) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates }
    }
  }

  /**
   * 删除列表项
   * @param {number|string} id - 项的 ID
   */
  function removeItem(id) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
  }

  /**
   * 查找列表项
   * @param {number|string} id - 项的 ID
   * @returns {*} 找到的项或 undefined
   */
  function findItem(id) {
    return items.value.find(item => item.id === id)
  }

  /**
   * 清空列表
   */
  function clear() {
    items.value = []
    selectedIds.value.clear()
  }

  /**
   * 切换选中状态
   * @param {number|string} id - 项的 ID
   */
  function toggleSelection(id) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  /**
   * 全选/取消全选
   */
  function toggleSelectAll() {
    if (selectedIds.value.size === items.value.length) {
      selectedIds.value.clear()
    } else {
      items.value.forEach(item => selectedIds.value.add(item.id))
    }
  }

  /**
   * 清除选中
   */
  function clearSelection() {
    selectedIds.value.clear()
  }

  /**
   * 获取选中的项
   * @returns {Array} 选中的项数组
   */
  function getSelectedItems() {
    return items.value.filter(item => selectedIds.value.has(item.id))
  }

  return {
    items,
    selectedIds,
    setItems,
    addItem,
    updateItem,
    removeItem,
    findItem,
    clear,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    getSelectedItems
  }
}

/**
 * 创建筛选状态管理
 * @returns {Object} 包含筛选状态和方法
 */
export function useFilterState() {
  const filters = ref({})

  /**
   * 设置筛选条件
   * @param {string} key - 筛选键
   * @param {*} value - 筛选值
   */
  function setFilter(key, value) {
    if (value === null || value === undefined || value === '') {
      delete filters.value[key]
    } else {
      filters.value[key] = value
    }
  }

  /**
   * 批量设置筛选条件
   * @param {Object} newFilters - 新的筛选条件
   */
  function setFilters(newFilters) {
    filters.value = { ...newFilters }
  }

  /**
   * 清除筛选条件
   * @param {string} [key] - 要清除的键，不传则清除所有
   */
  function clearFilter(key) {
    if (key) {
      delete filters.value[key]
    } else {
      filters.value = {}
    }
  }

  /**
   * 获取筛选条件
   * @returns {Object} 筛选条件对象
   */
  function getFilters() {
    return { ...filters.value }
  }

  /**
   * 检查是否有筛选条件
   * @returns {boolean}
   */
  function hasFilters() {
    return Object.keys(filters.value).length > 0
  }

  return {
    filters,
    setFilter,
    setFilters,
    clearFilter,
    getFilters,
    hasFilters
  }
}
