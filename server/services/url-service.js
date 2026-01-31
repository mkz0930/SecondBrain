import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import logger from '../utils/logger.js'

/**
 * 从文本中提取 URL
 * @param {string} text - 文本内容
 * @param {string} [providedUrl] - 用户提供的 URL
 * @returns {string|null} 提取的 URL 或 null
 */
function extractUrl(text, providedUrl = null) {
  if (providedUrl) {
    return providedUrl
  }

  // URL 正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/gi
  const matches = text.match(urlRegex)

  if (matches && matches.length > 0) {
    return matches[0]
  }

  return null
}

/**
 * 获取并解析 URL 内容
 * @param {string} url - 要获取的 URL
 * @param {Object} [options] - 配置选项
 * @param {number} [options.timeout=15000] - 超时时间（毫秒）
 * @param {number} [options.maxRedirects=5] - 最大重定向次数
 * @returns {Promise<Object>} 解析后的内容
 * @returns {string} return.content - 文本内容
 * @returns {string} return.title - 标题
 * @returns {string} return.excerpt - 摘要
 * @returns {string} return.html - HTML 内容
 * @returns {string} return.url - 最终 URL（可能经过重定向）
 */
async function fetchAndParseUrl(url, options = {}) {
  const {
    timeout = 15000,
    maxRedirects = 5
  } = options

  try {
    logger.info(`Fetching URL: ${url}`)

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout,
      maxRedirects
    })

    const finalUrl = response.request.res.responseUrl || url

    logger.info(`Successfully fetched URL: ${finalUrl}`)

    // 使用 Readability 解析内容
    const dom = new JSDOM(response.data, { url: finalUrl })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (article) {
      return {
        content: article.textContent || '',
        title: article.title || 'Untitled',
        excerpt: article.excerpt || '',
        html: article.content || '',
        url: finalUrl
      }
    } else {
      // 如果 Readability 无法解析，返回基本信息
      logger.warn(`Readability failed to parse URL: ${finalUrl}`)
      return {
        content: url,
        title: 'New Note',
        excerpt: '',
        html: '',
        url: finalUrl
      }
    }

  } catch (error) {
    logger.error(`Failed to fetch URL: ${url}`, error)

    // 返回基本信息而不是抛出错误
    return {
      content: url,
      title: 'New Note',
      excerpt: '',
      html: '',
      url,
      error: error.message
    }
  }
}

/**
 * 验证 URL 格式
 * @param {string} url - 要验证的 URL
 * @returns {boolean} 是否为有效的 URL
 */
function isValidUrl(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 规范化 URL（添加协议等）
 * @param {string} url - 要规范化的 URL
 * @returns {string} 规范化后的 URL
 */
function normalizeUrl(url) {
  if (!url) return ''

  let normalized = url.trim()

  // 如果没有协议，添加 https://
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = 'https://' + normalized
  }

  return normalized
}

// ES Module exports
export { extractUrl, fetchAndParseUrl, isValidUrl, normalizeUrl }
