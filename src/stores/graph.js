import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useGraphStore = defineStore('graph', () => {
  // 状态
  const graphData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const selectedNode = ref(null)
  const nodeDetail = ref(null)
  const relatedNodes = ref([])

  // 筛选器状态
  const filters = ref({
    contentTypes: [],
    tagIds: [],
    startDate: null,
    endDate: null,
    minConnections: 0
  })

  // 计算属性
  const hasData = computed(() => graphData.value !== null)
  const nodeCount = computed(() => graphData.value?.nodes?.length || 0)
  const edgeCount = computed(() => graphData.value?.edges?.length || 0)
  const stats = computed(() => graphData.value?.stats || {})

  /**
   * 获取图谱数据
   */
  async function fetchGraphData(options = {}) {
    loading.value = true
    error.value = null

    try {
      const params = {
        contentTypes: JSON.stringify(options.contentTypes || filters.value.contentTypes),
        tagIds: JSON.stringify(options.tagIds || filters.value.tagIds),
        startDate: options.startDate || filters.value.startDate,
        endDate: options.endDate || filters.value.endDate,
        minConnections: options.minConnections ?? filters.value.minConnections
      }

      const response = await axios.get('/api/graph/data', { params })

      if (response.data.success) {
        graphData.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取图谱数据失败')
      }
    } catch (err) {
      error.value = err.message || '网络错误'
      console.error('Error fetching graph data:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取节点详情
   */
  async function fetchNodeDetail(nodeId) {
    try {
      const response = await axios.get(`/api/graph/node/${nodeId}`)

      if (response.data.success) {
        nodeDetail.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取节点详情失败')
      }
    } catch (err) {
      console.error('Error fetching node detail:', err)
      throw err
    }
  }

  /**
   * 获取相关节点
   */
  async function fetchRelatedNodes(nodeId, limit = 10) {
    try {
      const response = await axios.get(`/api/graph/related/${nodeId}`, {
        params: { limit }
      })

      if (response.data.success) {
        relatedNodes.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取相关节点失败')
      }
    } catch (err) {
      console.error('Error fetching related nodes:', err)
      throw err
    }
  }

  /**
   * 获取图谱统计信息
   */
  async function fetchGraphStats() {
    try {
      const response = await axios.get('/api/graph/stats')

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取统计信息失败')
      }
    } catch (err) {
      console.error('Error fetching graph stats:', err)
      throw err
    }
  }

  /**
   * 更新筛选器
   */
  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * 重置筛选器
   */
  function resetFilters() {
    filters.value = {
      contentTypes: [],
      tagIds: [],
      startDate: null,
      endDate: null,
      minConnections: 0
    }
  }

  /**
   * 选择节点
   */
  function selectNode(node) {
    selectedNode.value = node
  }

  /**
   * 清除选择
   */
  function clearSelection() {
    selectedNode.value = null
    nodeDetail.value = null
    relatedNodes.value = []
  }

  /**
   * 刷新图谱数据
   */
  async function refresh() {
    return fetchGraphData()
  }

  /**
   * 清空数据
   */
  function clear() {
    graphData.value = null
    selectedNode.value = null
    nodeDetail.value = null
    relatedNodes.value = []
    error.value = null
  }

  return {
    // 状态
    graphData,
    loading,
    error,
    selectedNode,
    nodeDetail,
    relatedNodes,
    filters,

    // 计算属性
    hasData,
    nodeCount,
    edgeCount,
    stats,

    // 方法
    fetchGraphData,
    fetchNodeDetail,
    fetchRelatedNodes,
    fetchGraphStats,
    updateFilters,
    resetFilters,
    selectNode,
    clearSelection,
    refresh,
    clear
  }
})
