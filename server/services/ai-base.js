import { GoogleGenerativeAI } from '@google/generative-ai'
import logger from '../utils/logger.js'

/**
 * AI 模型配置
 * 按优先级排序，从最快到最强大
 */
const AI_MODELS = [
  'gemini-3-flash-preview'
]

/**
 * 并发控制配置
 * Gemini API 支持高并发 (1000 QPS)，但我们保守设置避免突发限流
 */
const CONCURRENCY_CONFIG = {
  maxConcurrent: 100,     // 最大并发请求数
  minDelayMs: 20,         // 请求间最小延迟 (ms)
  batchSize: 20           // 批量处理时每批大小
}

// 并发控制状态
let activeRequests = 0
const requestQueue = []

/**
 * 并发控制 - 获取执行槽位
 * @returns {Promise<void>}
 */
async function acquireSlot() {
  if (activeRequests < CONCURRENCY_CONFIG.maxConcurrent) {
    activeRequests++
    return
  }

  // 等待槽位释放
  return new Promise(resolve => {
    requestQueue.push(resolve)
  })
}

/**
 * 并发控制 - 释放执行槽位
 */
function releaseSlot() {
  activeRequests--
  if (requestQueue.length > 0) {
    const next = requestQueue.shift()
    activeRequests++
    next()
  }
}

/**
 * 获取 Google Generative AI 实例
 * @returns {GoogleGenerativeAI}
 * @throws {Error} 如果未配置 API key
 */
function getGenAI() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Google API key not configured. Please set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.')
  }

  return new GoogleGenerativeAI(apiKey)
}

/**
 * 使用重试机制生成 AI 内容
 *
 * @param {GoogleGenerativeAI} genAI - Google Generative AI 实例
 * @param {string} prompt - 提示词
 * @param {number} [retries=3] - 重试次数
 * @param {number} [modelIndex=0] - 当前模型索引
 * @returns {Promise<string>} 生成的文本内容
 * @throws {Error} 所有模型都失败时抛出错误
 */
async function generateWithRetry(genAI, prompt, retries = 3, modelIndex = 0) {
  const modelName = AI_MODELS[modelIndex % AI_MODELS.length]
  const model = genAI.getGenerativeModel({ model: modelName })

  const attemptNum = 4 - retries
  if (attemptNum === 1) {
    logger.info(`AI generation with model: ${modelName}`)
  } else {
    logger.info(`AI generation retry ${attemptNum}/3 with model: ${modelName}`)
  }

  await acquireSlot()

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error('Empty response from AI model')
    }

    logger.debug(`AI generation successful with model: ${modelName}`)
    return text

  } catch (error) {
    logger.warn(`AI generation failed with model ${modelName}:`, error.message)

    // 如果还有重试次数，使用相同模型重试
    if (retries > 1) {
      const delay = error.status === 429 ? 2000 : 500 // 429 错误等待更长
      await sleep(delay)
      return generateWithRetry(genAI, prompt, retries - 1, modelIndex)
    }

    // 如果没有重试次数了，尝试下一个模型
    const nextModelIndex = modelIndex + 1
    if (nextModelIndex < AI_MODELS.length) {
      logger.info(`Switching to next model: ${AI_MODELS[nextModelIndex]}`)
      return generateWithRetry(genAI, prompt, 3, nextModelIndex)
    }

    // 所有模型都失败了
    logger.error('All AI models failed:', error)
    throw new Error(`AI generation failed after trying all models: ${error.message}`)
  } finally {
    releaseSlot()
  }
}

/**
 * 批量并发执行 AI 生成任务
 * 利用 Gemini 高并发能力，同时处理多个请求
 *
 * @param {GoogleGenerativeAI} genAI - Google Generative AI 实例
 * @param {Array<{prompt: string, id?: any}>} tasks - 任务列表
 * @param {Object} [options] - 配置选项
 * @param {number} [options.batchSize] - 每批大小
 * @param {Function} [options.onProgress] - 进度回调 (completed, total)
 * @returns {Promise<Array<{id?: any, result?: string, error?: string}>>}
 */
async function generateBatch(genAI, tasks, options = {}) {
  const { batchSize = CONCURRENCY_CONFIG.batchSize, onProgress } = options
  const results = []
  let completed = 0

  logger.info(`[Batch] Starting batch generation: ${tasks.length} tasks, batch size: ${batchSize}`)

  // 分批处理
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)

    // 并发执行当前批次
    const batchPromises = batch.map(async (task) => {
      try {
        const result = await generateWithRetry(genAI, task.prompt)
        return { id: task.id, result }
      } catch (error) {
        logger.warn(`[Batch] Task ${task.id} failed:`, error.message)
        return { id: task.id, error: error.message }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    completed += batch.length
    if (onProgress) {
      onProgress(completed, tasks.length)
    }

    // 批次间短暂延迟，避免突发流量
    if (i + batchSize < tasks.length) {
      await sleep(CONCURRENCY_CONFIG.minDelayMs)
    }
  }

  const successCount = results.filter(r => r.result).length
  logger.info(`[Batch] Completed: ${successCount}/${tasks.length} successful`)

  return results
}

/**
 * 并发执行多个独立的 AI 任务（不同 prompt）
 * 适用于需要同时处理多个不同任务的场景
 *
 * @param {GoogleGenerativeAI} genAI - Google Generative AI 实例
 * @param {Array<{prompt: string, id?: any}>} tasks - 任务列表
 * @returns {Promise<Map<any, string|null>>} id -> result 映射
 */
async function generateConcurrent(genAI, tasks) {
  const results = await generateBatch(genAI, tasks)
  const resultMap = new Map()

  for (const { id, result, error } of results) {
    resultMap.set(id, error ? null : result)
  }

  return resultMap
}

/**
 * 解析 AI 返回的 JSON 响应
 *
 * @param {string} text - AI 返回的文本
 * @returns {Object} 解析后的 JSON 对象
 * @throws {Error} 解析失败时抛出错误
 */
function parseAIResponse(text) {
  try {
    // 移除可能的 markdown 代码块标记
    let cleanText = text.trim()

    // 移除 ```json 和 ``` 标记
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }

    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }

    cleanText = cleanText.trim()

    // 解析 JSON
    return JSON.parse(cleanText)

  } catch (error) {
    logger.error('Failed to parse AI response:', {
      error: error.message,
      text: text.substring(0, 200) // 只记录前 200 个字符
    })
    throw new Error(`Failed to parse AI response: ${error.message}`)
  }
}

/**
 * 休眠指定毫秒数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 验证 AI 配置
 * @returns {boolean} 是否配置了 API key
 */
function isAIConfigured() {
  return !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
}

/**
 * 使用 Google Search grounding 生成 AI 内容
 * 启用网络搜索以获取实时信息
 *
 * @param {GoogleGenerativeAI} genAI - Google Generative AI 实例
 * @param {string} prompt - 提示词
 * @param {number} [retries=3] - 重试次数
 * @returns {Promise<{text: string, groundingMetadata?: Object}>} 生成的文本内容和 grounding 元数据
 */
async function generateWithSearch(genAI, prompt, retries = 3) {
  const modelName = AI_MODELS[0]
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ googleSearch: {} }]
  })

  const attemptNum = 4 - retries
  if (attemptNum === 1) {
    logger.info(`[Search AI] Generation with Google Search, model: ${modelName}`)
  } else {
    logger.info(`[Search AI] Retry ${attemptNum}/3 with model: ${modelName}`)
  }

  await acquireSlot()

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error('Empty response from AI model')
    }

    // 提取 grounding 元数据（如果有）
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null

    logger.debug(`[Search AI] Generation successful, has grounding: ${!!groundingMetadata}`)

    return {
      text,
      groundingMetadata
    }

  } catch (error) {
    logger.warn('[Search AI] Generation failed:', error.message)

    if (retries > 1) {
      const delay = error.status === 429 ? 2000 : 500
      await sleep(delay)
      return generateWithSearch(genAI, prompt, retries - 1)
    }

    logger.error('[Search AI] All retries failed:', error)
    throw new Error(`Search AI generation failed: ${error.message}`)
  } finally {
    releaseSlot()
  }
}

/**
 * 使用多模态内容（图片+文本）生成 AI 响应
 *
 * @param {GoogleGenerativeAI} genAI - Google Generative AI 实例
 * @param {string} prompt - 文本提示词
 * @param {Array<{data: string, mimeType: string}>} images - 图片数据数组，每个包含 base64 数据和 MIME 类型
 * @param {number} [retries=3] - 重试次数
 * @returns {Promise<string>} 生成的文本内容
 */
async function generateWithImages(genAI, prompt, images, retries = 3) {
  const modelName = AI_MODELS[0]
  const model = genAI.getGenerativeModel({ model: modelName })

  const attemptNum = 4 - retries
  if (attemptNum === 1) {
    logger.info(`[Image AI] Multimodal generation with model: ${modelName}, images: ${images.length}`)
  } else {
    logger.info(`[Image AI] Retry ${attemptNum}/3 with model: ${modelName}`)
  }

  await acquireSlot()

  try {
    // 构建多模态内容
    const parts = [
      { text: prompt },
      ...images.map(img => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      }))
    ]

    const result = await model.generateContent(parts)
    const response = await result.response
    const text = response.text()

    if (!text) {
      throw new Error('Empty response from AI model')
    }

    logger.debug('[Image AI] Generation successful')
    return text

  } catch (error) {
    logger.warn('[Image AI] Generation failed:', error.message)

    if (retries > 1) {
      const delay = error.status === 429 ? 2000 : 500
      await sleep(delay)
      return generateWithImages(genAI, prompt, images, retries - 1)
    }

    logger.error('[Image AI] All retries failed:', error)
    throw new Error(`Image AI generation failed: ${error.message}`)
  } finally {
    releaseSlot()
  }
}

// ES Module exports
export {
  AI_MODELS,
  CONCURRENCY_CONFIG,
  getGenAI,
  generateWithRetry,
  generateWithSearch,
  generateWithImages,
  generateBatch,
  generateConcurrent,
  parseAIResponse,
  isAIConfigured,
  sleep
}
