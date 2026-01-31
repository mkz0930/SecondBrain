import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'
import { useAsyncState, useListState } from '../utils/store-helpers'
import { createCrudApi, handleApiError } from '../utils/api-helpers'

const tagApi = createCrudApi('/api/tags')

export const useTagStore = defineStore('tag', () => {
  // 使用辅助工具管理状态
  const { loading, error, execute, clearError } = useAsyncState()
  const { items: tags, setItems, addItem, updateItem, removeItem, findItem } = useListState()

  /**
   * 标签 Map（用于快速查找）
   */
  const tagMap = computed(() => {
    return new Map(tags.value.map(tag => [tag.id, tag]))
  })

  /**
   * 按名称查找标签
   * @param {string} name - 标签名称
   * @returns {Object|undefined} 标签对象
   */
  const findTagByName = computed(() => {
    return (name) => tags.value.find(tag => tag.name === name)
  })

  /**
   * 获取标签列表
   */
  async function fetchTags() {
    return execute(async () => {
      const response = await tagApi.getList()
      setItems(response.data || response)
      return tags.value
    })
  }

  /**
   * 创建标签
   * @param {Object} data - 标签数据
   * @param {string} data.name - 标签名称
   * @param {string} [data.color] - 标签颜色
   */
  async function createTag(data) {
    return execute(async () => {
      const response = await tagApi.create(data)
      const newTag = response.data || response

      // 添加到列表
      if (newTag.id) {
        addItem(newTag)
      }

      return newTag
    })
  }

  /**
   * 更新标签
   * @param {number|string} id - 标签 ID
   * @param {Object} data - 更新数据
   */
  async function updateTag(id, data) {
    return execute(async () => {
      const response = await tagApi.update(id, data)

      // 更新列表中的标签
      updateItem(id, data)

      return response
    })
  }

  /**
   * 删除标签
   * @param {number|string} id - 标签 ID
   */
  async function deleteTag(id) {
    return execute(async () => {
      await tagApi.delete(id)

      // 从列表中移除
      removeItem(id)
    })
  }

  /**
   * 获取标签名称
   * @param {number|string} id - 标签 ID
   * @returns {string} 标签名称
   */
  function getTagName(id) {
    return tagMap.value.get(id)?.name || ''
  }

  /**
   * 获取标签颜色
   * @param {number|string} id - 标签 ID
   * @returns {string} 标签颜色
   */
  function getTagColor(id) {
    return tagMap.value.get(id)?.color || '#e4e7ed'
  }

  /**
   * 查找或创建标签
   * @param {string} name - 标签名称
   * @param {string} [color] - 标签颜色
   * @returns {Promise<Object>} 标签对象
   */
  async function findOrCreateTag(name, color = null) {
    // 先查找是否已存在
    const existing = findTagByName.value(name)
    if (existing) {
      return existing
    }

    // 不存在则创建
    return await createTag({ name, color })
  }

  /**
   * 批量创建标签
   * @param {Array<string>} names - 标签名称数组
   * @returns {Promise<Array<Object>>} 创建的标签数组
   */
  async function batchCreateTags(names) {
    const results = []

    for (const name of names) {
      try {
        const tag = await findOrCreateTag(name)
        results.push(tag)
      } catch (err) {
        console.error(`Failed to create tag: ${name}`, err)
      }
    }

    return results
  }

  /**
   * 重置状态
   */
  function reset() {
    setItems([])
    clearError()
  }

  return {
    // 状态
    tags,
    loading,
    error,
    tagMap,
    findTagByName,

    // 方法
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    getTagName,
    getTagColor,
    findOrCreateTag,
    batchCreateTags,
    reset,
    clearError
  }
})
