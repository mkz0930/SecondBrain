/**
 * 前端 API 调用辅助工具
 */

import api from './api'

/**
 * 创建标准的 CRUD API 调用函数
 * @param {string} baseUrl - 基础 URL（如 '/api/contents'）
 * @returns {Object} 包含 CRUD 方法的对象
 */
export function createCrudApi(baseUrl) {
  return {
    /**
     * 获取列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    async getList(params = {}) {
      const response = await api.get(baseUrl, { params })
      return response.data
    },

    /**
     * 获取单个项
     * @param {number|string} id - 项的 ID
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    async getOne(id, params = {}) {
      const response = await api.get(`${baseUrl}/${id}`, { params })
      return response.data
    },

    /**
     * 创建项
     * @param {Object} data - 要创建的数据
     * @returns {Promise<Object>} 响应数据
     */
    async create(data) {
      const response = await api.post(baseUrl, data)
      return response.data
    },

    /**
     * 更新项
     * @param {number|string} id - 项的 ID
     * @param {Object} data - 要更新的数据
     * @returns {Promise<Object>} 响应数据
     */
    async update(id, data) {
      const response = await api.put(`${baseUrl}/${id}`, data)
      return response.data
    },

    /**
     * 删除项
     * @param {number|string} id - 项的 ID
     * @returns {Promise<Object>} 响应数据
     */
    async delete(id) {
      const response = await api.delete(`${baseUrl}/${id}`)
      return response.data
    }
  }
}

/**
 * 处理 API 错误
 * @param {Error} error - 错误对象
 * @param {string} defaultMessage - 默认错误消息
 * @returns {string} 错误消息
 */
export function handleApiError(error, defaultMessage = '操作失败') {
  if (error.response) {
    // 服务器返回了错误响应
    const { data, status } = error.response

    if (status === 401) {
      return '未授权，请重新登录'
    }

    if (status === 403) {
      return '没有权限执行此操作'
    }

    if (status === 404) {
      return '请求的资源不存在'
    }

    if (status === 422 || status === 400) {
      // 验证错误
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(e => e.message || e).join(', ')
      }
      return data.message || data.error || defaultMessage
    }

    return data.message || data.error || defaultMessage
  }

  if (error.request) {
    // 请求已发送但没有收到响应
    return '网络错误，请检查网络连接'
  }

  // 其他错误
  return error.message || defaultMessage
}

/**
 * 创建带重试的 API 调用
 * @param {Function} apiFn - API 调用函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @returns {Promise<*>} API 调用结果
 */
export async function withRetry(apiFn, maxRetries = 3, delay = 1000) {
  let lastError

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFn()
    } catch (error) {
      lastError = error

      // 如果是客户端错误（4xx），不重试
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error
      }

      // 如果还有重试次数，等待后重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }

  throw lastError
}

/**
 * 批量 API 调用（并发控制）
 * @param {Array<Function>} apiFns - API 调用函数数组
 * @param {number} concurrency - 并发数
 * @returns {Promise<Array>} 结果数组
 */
export async function batchApiCalls(apiFns, concurrency = 5) {
  const results = []
  const executing = []

  for (const [index, apiFn] of apiFns.entries()) {
    const promise = Promise.resolve().then(() => apiFn()).then(
      result => ({ success: true, result, index }),
      error => ({ success: false, error, index })
    )

    results.push(promise)

    if (concurrency <= apiFns.length) {
      const executing_promise = promise.then(() => {
        executing.splice(executing.indexOf(executing_promise), 1)
      })
      executing.push(executing_promise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }
    }
  }

  return Promise.all(results)
}

/**
 * 防抖 API 调用
 * @param {Function} apiFn - API 调用函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounceApi(apiFn, delay = 300) {
  let timeoutId

  return function (...args) {
    clearTimeout(timeoutId)

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await apiFn(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }
}

/**
 * 节流 API 调用
 * @param {Function} apiFn - API 调用函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttleApi(apiFn, delay = 300) {
  let lastCall = 0
  let timeoutId

  return function (...args) {
    const now = Date.now()

    if (now - lastCall >= delay) {
      lastCall = now
      return apiFn(...args)
    } else {
      clearTimeout(timeoutId)

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          lastCall = Date.now()
          try {
            const result = await apiFn(...args)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }, delay - (now - lastCall))
      })
    }
  }
}
