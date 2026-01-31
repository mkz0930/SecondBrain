import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { getGenAI, generateWithRetry, generateWithSearch, generateWithImages, parseAIResponse } from './ai-base.js'
import { extractUrl, fetchAndParseUrl } from './url-service.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let genAI = null

/**
 * 分析内容并提取结构化信息
 * @param {string} text - 原始文本内容
 * @param {string} [providedUrl] - 用户提供的 URL
 * @returns {Promise<Object|null>} 分析结果
 */
export async function analyzeContent(text, providedUrl = null) {
  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('Google API Key not found. Skipping AI analysis.')
      return null
    }
  }

  // 1. 提取 URL
  const url = extractUrl(text, providedUrl)
  let fetchedContent = ''
  let fetchedTitle = ''
  let fetchedExcerpt = ''

  // 2. 如果有 URL，使用 Readability 获取干净的文章内容
  if (url) {
    try {
      const parsed = await fetchAndParseUrl(url, { timeout: 15000 })
      if (parsed && !parsed.error) {
        // 使用 Readability 解析的干净内容
        fetchedContent = parsed.content ? parsed.content.substring(0, 10000) : ''
        fetchedTitle = parsed.title || ''
        fetchedExcerpt = parsed.excerpt || ''
        logger.info(`[AI分析] 成功获取URL内容，标题: ${fetchedTitle}, 内容长度: ${fetchedContent.length}`)
      } else {
        logger.warn(`[AI分析] URL内容获取失败: ${parsed?.error || '未知错误'}`)
      }
    } catch (error) {
      logger.error('[AI分析] Error fetching URL:', error.message)
      // 继续处理，不中断流程
    }
  }

  // 3. 调用 AI 分析
  const prompt = `
  请分析以下内容，并以JSON格式提取/生成以下字段（不要包含Markdown格式标记，content字段除外）：
  1. title: 重新提炼一个合适的标题，如果原标题不清晰，请根据内容生成更好的标题。字数限制在50个字以内，不要太长。
  2. summary: 一个简洁的中文摘要。
  3. type: 将内容分类为以下确切值之一："随便", "抖音", "公众号", "文档", "B站", "其他"。
  4. tags: 提取3-5个相关的标签（字符串数组）。
  5. content: 重构并详细整理正文内容，使其结构清晰、易读。使用Markdown格式（如使用## 分级标题、- 列表等），保留核心信息，去除广告和无关内容。确保内容详实。

  用户输入内容:
  ${text}

  ${fetchedContent ? `从URL获取的文章信息:
  - 原始标题: ${fetchedTitle}
  - 摘要: ${fetchedExcerpt}
  - 正文内容:
  ${fetchedContent}` : ''}

  请只返回JSON对象。
  `

  try {
    const textResult = await generateWithRetry(genAI, prompt)
    const json = parseAIResponse(textResult)

    return {
      title: json.title || '无标题',
      url: url,
      summary: json.summary || '',
      type: ['随便', '抖音', '公众号', '文档', 'B站', '其他'].includes(json.type) ? json.type : '其他',
      tags: Array.isArray(json.tags) ? json.tags : [],
      content: json.content || fetchedContent || text,
      fetchedContent: fetchedContent
    }
  } catch (error) {
    // 如果是速率限制错误，抛出让调用者处理
    if (error.status === 429) {
      throw error
    }

    logger.error('AI Analysis failed:', error)
    // 返回部分结果
    return {
      title: null,
      url: url,
      summary: null,
      type: '其他',
      content: fetchedContent || text,
      fetchedContent: fetchedContent
    }
  }
}

/**
 * 生成每日总结
 * @param {Array<Object>} contents - 内容列表
 * @returns {Promise<string|null>} 总结文本
 */
export async function generateDailySummary(contents) {
  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('Google API Key not found. Skipping daily summary.')
      return null
    }
  }

  if (!contents || contents.length === 0) {
    return null
  }

  // 构建内容文本
  const contentText = contents.map((c, index) => {
    const text = c.summary || (c.content ? c.content.substring(0, 200) : '') || c.title
    return `${index + 1}. 标题: ${c.title}\n   内容摘要: ${text}...`
  }).join('\n\n')

  const prompt = `
请根据以下今天的笔记内容，生成一个精炼的日报总结。

要求：
1. 使用编号列表格式，每条占一行
2. 每条总结一个核心主题或关键信息，一句话概括
3. 最多5条，每条不超过30字
4. 【重要】每条之间必须换行，不要把所有内容写在一行
5. 不要有开头语或结尾语，直接输出列表

正确示例（注意每条独占一行）：
1. 学习了Vue3组合式API的基本用法
2. 整理了项目架构设计文档
3. 研究了飞书API的同步机制

错误示例（不要这样）：
1. xxx 2. xxx 3. xxx

今日笔记列表：
${contentText}
`

  try {
    const textResult = await generateWithRetry(genAI, prompt)
    return textResult.trim()
  } catch (error) {
    logger.error('Daily summary generation failed:', error)
    return null
  }
}

/**
 * 优化内容格式和组织结构
 * @param {string} content - 需要优化的内容
 * @returns {Promise<string>} 优化后的内容
 */
export async function optimizeContentFormat(content) {
  logger.info(`[格式优化] 开始优化内容，原始长度: ${content?.length || 0} 字符`)

  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('[格式优化] Google API Key not found. Skipping content format optimization.')
      return content
    }
  }

  if (!content || content.trim().length === 0) {
    logger.info('[格式优化] 内容为空，跳过优化')
    return content
  }

  const prompt = `
请优化以下内容的格式和组织结构，保持所有信息完整：

要求：
1. 改善段落结构和可读性
2. 添加适当的标题（使用 ## 格式）组织内容
3. 使用项目符号（-）或编号列表来组织要点
4. 移除重复内容和无意义的填充文字
5. 提升内容的逻辑性和清晰度
6. 保持原有的语气和风格
7. 保留所有URL和重要信息
8. 使用Markdown格式输出

内容：
${content}

请只返回优化后的内容，不要添加任何解释或额外文字。
`

  try {
    let optimizedContent = await generateWithRetry(genAI, prompt)

    // 移除可能的 markdown 代码块标记
    optimizedContent = optimizedContent.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '').trim()

    logger.info(`[格式优化] 优化完成，优化后长度: ${optimizedContent.length} 字符，变化: ${optimizedContent.length - content.length} 字符`)

    return optimizedContent
  } catch (error) {
    logger.error(`[格式优化] Content format optimization failed: ${error.message}`)
    // 如果优化失败，返回原始内容
    return content
  }
}

/**
 * 检测内容是否为纯图片内容（无有效文本）
 * @param {string} text - 文本内容
 * @param {Array} attachments - 附件列表
 * @returns {boolean} 是否为纯图片内容
 */
export function isImageOnlyContent(text, attachments) {
  // 检查是否有图片附件
  const hasImageAttachments = attachments && attachments.length > 0 &&
    attachments.some(att => att.type && att.type.startsWith('image/'))

  if (!hasImageAttachments) {
    return false
  }

  // 检查文本是否为空或无效
  if (!text || text.trim().length === 0) {
    return true
  }

  // 检查文本是否只是无效占位符
  const invalidPatterns = [
    /^image$/i,
    /^图片$/,
    /^\[image\]$/i,
    /^\[图片\]$/,
    /^photo$/i,
    /^picture$/i,
    /^img$/i,
    /^attachment$/i,
    /^附件$/,
    /^file$/i,
    /^文件$/,
    /^untitled$/i,
    /^无标题$/,
    /^new note$/i,
    /^新笔记$/,
    /^\.{1,3}$/,  // 只有点号
    /^-+$/,       // 只有横线
    /^_+$/,       // 只有下划线
  ]

  const trimmedText = text.trim()

  // 如果文本匹配无效模式，认为是纯图片内容
  if (invalidPatterns.some(pattern => pattern.test(trimmedText))) {
    return true
  }

  // 如果文本很短（少于10个字符）且有图片，也认为是纯图片内容
  if (trimmedText.length < 10) {
    return true
  }

  return false
}

/**
 * 分析图片内容并提取结构化信息
 * @param {Array} attachments - 附件列表，包含图片信息
 * @param {string} [existingText] - 已有的文本内容（可能为空或无效）
 * @returns {Promise<Object|null>} 分析结果
 */
export async function analyzeImageContent(attachments, existingText = '') {
  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('[图片分析] Google API Key not found. Skipping image analysis.')
      return null
    }
  }

  // 过滤出图片附件
  const imageAttachments = attachments.filter(att => att.type && att.type.startsWith('image/'))

  if (imageAttachments.length === 0) {
    logger.warn('[图片分析] No image attachments found.')
    return null
  }

  logger.info(`[图片分析] 开始分析 ${imageAttachments.length} 张图片`)

  // 读取图片文件并转换为 base64
  const images = []
  const uploadsDir = join(__dirname, '../../uploads')

  for (const att of imageAttachments) {
    try {
      // 从 URL 中提取文件名（格式如 /uploads/xxx.jpg）
      const filename = att.url.replace(/^\/uploads\//, '')
      const filePath = join(uploadsDir, filename)

      const imageBuffer = await readFile(filePath)
      const base64Data = imageBuffer.toString('base64')

      images.push({
        data: base64Data,
        mimeType: att.type
      })

      logger.debug(`[图片分析] 已加载图片: ${filename}`)
    } catch (error) {
      logger.error(`[图片分析] 读取图片失败: ${att.url}`, error.message)
    }
  }

  if (images.length === 0) {
    logger.error('[图片分析] 无法读取任何图片文件')
    return null
  }

  const prompt = `
请仔细分析这${images.length > 1 ? '些' : '张'}图片，并以JSON格式返回以下字段：

1. title: 根据图片内容生成一个简洁、准确的标题（不超过50字）。标题应该概括图片的主要内容或主题。
2. summary: 用2-3句话描述图片的主要内容和关键信息。
3. type: 根据图片内容分类为以下确切值之一：
   - "随便": 日常随拍、生活照片、风景等
   - "文档": 文档截图、书籍页面、笔记、表格等
   - "公众号": 微信公众号文章截图
   - "抖音": 抖音/短视频截图
   - "B站": 哔哩哔哩/bilibili视频或文章截图
   - "其他": 其他类型
4. tags: 提取3-5个相关的标签（字符串数组），描述图片的主题、场景、物体等。
5. content: 详细描述图片内容，使用Markdown格式。如果图片中有文字，请尽可能提取出来。如果是多张图片，请分别描述每张图片的内容。

${existingText && existingText.trim().length > 10 ? `用户提供的参考文本: ${existingText}` : ''}

请只返回JSON对象，不要包含其他内容。
`

  try {
    const textResult = await generateWithImages(genAI, prompt, images)
    const json = parseAIResponse(textResult)

    logger.info(`[图片分析] 分析完成，标题: ${json.title}`)

    return {
      title: json.title || '图片笔记',
      summary: json.summary || '',
      type: ['随便', '抖音', '公众号', '文档', 'B站', '其他'].includes(json.type) ? json.type : '其他',
      tags: Array.isArray(json.tags) ? json.tags : [],
      content: json.content || '图片内容',
      isImageAnalysis: true
    }
  } catch (error) {
    logger.error('[图片分析] AI 分析失败:', error)
    return null
  }
}

/**
 * 智能分析内容 - 自动检测并处理纯图片内容
 * @param {string} text - 原始文本内容
 * @param {string} [providedUrl] - 用户提供的 URL
 * @param {Array} [attachments] - 附件列表
 * @returns {Promise<Object|null>} 分析结果
 */
export async function analyzeContentSmart(text, providedUrl = null, attachments = []) {
  // 检测是否为纯图片内容
  if (isImageOnlyContent(text, attachments)) {
    logger.info('[智能分析] 检测到纯图片内容，使用图片分析')
    const imageResult = await analyzeImageContent(attachments, text)
    if (imageResult) {
      return imageResult
    }
    // 如果图片分析失败，继续使用普通分析
    logger.warn('[智能分析] 图片分析失败，回退到普通分析')
  }

  // 使用普通文本分析
  return analyzeContent(text, providedUrl)
}

/**
 * 使用网络搜索增强的内容分析
 * 当需要获取实时信息或补充背景知识时使用
 * @param {string} text - 原始文本内容
 * @param {string} [providedUrl] - 用户提供的 URL
 * @param {Object} [options] - 选项
 * @param {boolean} [options.forceSearch=false] - 强制使用网络搜索
 * @param {string} [options.searchQuery] - 自定义搜索查询（可选）
 * @returns {Promise<Object|null>} 分析结果，包含网络搜索来源
 */
export async function analyzeContentWithSearch(text, providedUrl = null, options = {}) {
  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('[网络搜索分析] Google API Key not found. Skipping AI analysis.')
      return null
    }
  }

  const { forceSearch = false, searchQuery = null } = options

  // 1. 提取 URL
  const url = extractUrl(text, providedUrl)
  let fetchedContent = ''
  let fetchedTitle = ''

  // 2. 如果有 URL，获取内容
  if (url) {
    try {
      const parsed = await fetchAndParseUrl(url, { timeout: 15000 })
      if (parsed && !parsed.error) {
        fetchedContent = parsed.content ? parsed.content.substring(0, 8000) : ''
        fetchedTitle = parsed.title || ''
        logger.info(`[网络搜索分析] 成功获取URL内容，标题: ${fetchedTitle}`)
      }
    } catch (error) {
      logger.error('[网络搜索分析] Error fetching URL:', error.message)
    }
  }

  // 3. 构建带网络搜索的 prompt
  const prompt = `
请分析以下内容，并结合网络搜索获取的最新信息，以JSON格式返回以下字段：

1. title: 重新提炼一个合适的标题，字数限制在50个字以内。
2. summary: 一个简洁的中文摘要，结合网络搜索的补充信息。
3. type: 将内容分类为以下确切值之一："随便", "抖音", "公众号", "文档", "B站", "其他"。
4. tags: 提取3-5个相关的标签（字符串数组）。
5. content: 重构并详细整理正文内容，使用Markdown格式。如果网络搜索提供了有价值的补充信息，请整合进来。
6. searchInsights: 网络搜索提供的关键补充信息或最新动态（字符串，可为空）。

${searchQuery ? `请特别搜索关于: ${searchQuery}` : '请根据内容主题搜索相关的最新信息和背景知识。'}

用户输入内容:
${text}

${fetchedContent ? `从URL获取的文章信息:
- 原始标题: ${fetchedTitle}
- 正文内容:
${fetchedContent}` : ''}

请只返回JSON对象。
`

  try {
    logger.info('[网络搜索分析] 开始带网络搜索的AI分析')
    const { text: textResult, groundingMetadata } = await generateWithSearch(genAI, prompt)
    const json = parseAIResponse(textResult)

    // 提取搜索来源信息
    let sources = []
    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web.title || '',
          uri: chunk.web.uri || ''
        }))
    }

    logger.info(`[网络搜索分析] 分析完成，获取到 ${sources.length} 个搜索来源`)

    return {
      title: json.title || '无标题',
      url: url,
      summary: json.summary || '',
      type: ['随便', '抖音', '公众号', '文档', 'B站', '其他'].includes(json.type) ? json.type : '其他',
      tags: Array.isArray(json.tags) ? json.tags : [],
      content: json.content || fetchedContent || text,
      fetchedContent: fetchedContent,
      searchInsights: json.searchInsights || null,
      searchSources: sources,
      usedWebSearch: true
    }
  } catch (error) {
    if (error.status === 429) {
      throw error
    }

    logger.error('[网络搜索分析] AI Analysis with search failed:', error)

    // 回退到普通分析
    logger.info('[网络搜索分析] 回退到普通分析')
    return analyzeContent(text, providedUrl)
  }
}
