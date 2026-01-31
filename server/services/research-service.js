import { query, queryOne } from '../models/database.js'
import logger from '../utils/logger.js'
import { getGenAI, generateWithRetry, generateBatch, parseAIResponse } from './ai-base.js'

let genAI = null

/**
 * 初始化 AI 实例
 * @returns {GoogleGenerativeAI|null}
 */
function initAI() {
  if (!genAI) {
    try {
      genAI = getGenAI()
    } catch (error) {
      logger.warn('Google API Key not found. Research AI features unavailable.')
      return null
    }
  }
  return genAI
}

/**
 * 需求分析 - 生成研究问题
 */
export async function analyzeRequirements(topic, description = '') {
  const ai = initAI()
  if (!ai) return null

  const prompt = `
你是一个研究助手。用户想要研究以下主题：

主题：${topic}
${description ? `描述：${description}` : ''}

请分析这个研究主题，生成3-5个关键研究问题，这些问题应该：
1. 涵盖主题的核心方面
2. 由浅入深，循序渐进
3. 具有可研究性

请以JSON格式返回，格式如下：
{
  "questions": [
    { "question": "问题1", "order": 1 },
    { "question": "问题2", "order": 2 },
    ...
  ],
  "searchQueries": ["搜索关键词1", "搜索关键词2", ...]
}

只返回JSON，不要其他内容。
`

  try {
    const textResult = await generateWithRetry(ai, prompt)
    const json = parseAIResponse(textResult)
    return {
      questions: json.questions || [],
      searchQueries: json.searchQueries || []
    }
  } catch (error) {
    logger.error('[Research] 需求分析失败:', error)
    return null
  }
}

/**
 * 继续需求分析 - 根据用户回答生成后续问题
 */
export async function clarifyRequirement(projectId, question, answer) {
  const ai = initAI()
  if (!ai) return null

  // 获取项目信息和历史问题
  const project = await queryOne(
    'SELECT * FROM research_projects WHERE id = ?',
    [projectId]
  )

  const previousQuestions = await query(
    'SELECT question, answer FROM research_questions WHERE project_id = ? ORDER BY order_index',
    [projectId]
  )

  const historyText = previousQuestions.map(q =>
    `Q: ${q.question}\nA: ${q.answer || '未回答'}`
  ).join('\n\n')

  const prompt = `
你是一个研究助手。用户正在研究主题："${project.title}"

历史对话：
${historyText}

最新问题：${question}
用户回答：${answer}

基于用户的回答，请判断：
1. 是否需要进一步澄清需求？
2. 如果需要，生成1-2个后续问题
3. 如果不需要，返回空数组

请以JSON格式返回：
{
  "needMoreInfo": true/false,
  "questions": [
    { "question": "后续问题1" },
    { "question": "后续问题2" }
  ]
}

只返回JSON，不要其他内容。
`

  try {
    const textResult = await generateWithRetry(ai, prompt)
    const json = parseAIResponse(textResult)
    return json
  } catch (error) {
    logger.error('[Research] 需求澄清失败:', error)
    return null
  }
}

/**
 * 搜索本地内容
 */
export async function searchLocalMaterials(userId, searchQueries) {
  const materials = []

  for (const query of searchQueries) {
    try {
      const results = await queryDb(
        `SELECT id, title, content, summary, type, url, source, created_at
         FROM contents
         WHERE user_id = ?
         AND deleted_at IS NULL
         AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
         LIMIT 10`,
        [userId, `%${query}%`, `%${query}%`, `%${query}%`]
      )

      for (const result of results) {
        materials.push({
          type: 'local',
          source: `本地内容 #${result.id}`,
          title: result.title,
          content: result.content || result.summary || '',
          url: result.url || result.source || '',
          metadata: {
            contentId: result.id,
            contentType: result.type,
            createdAt: result.created_at
          }
        })
      }
    } catch (error) {
      logger.error(`[Research] 本地搜索失败 (${query}):`, error)
    }
  }

  return materials
}

// 使用 query 函数的别名
const queryDb = query

/**
 * 评估资料相关性
 */
export async function assessRelevance(material, researchTopic, questions) {
  const ai = initAI()
  if (!ai) return 0.5 // 默认中等相关性

  const questionsText = questions.map(q => q.question).join('\n')

  const prompt = `
研究主题：${researchTopic}

研究问题：
${questionsText}

资料标题：${material.title}
资料内容：${material.content.substring(0, 1000)}

请评估这份资料与研究主题的相关性，返回0-1之间的分数。
- 1.0: 高度相关，直接回答研究问题
- 0.7-0.9: 相关，提供有用信息
- 0.4-0.6: 部分相关
- 0.1-0.3: 弱相关
- 0: 不相关

只返回数字，不要其他内容。
`

  try {
    const textResult = await generateWithRetry(ai, prompt)
    const score = parseFloat(textResult.trim())
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score))
  } catch (error) {
    logger.error('[Research] 相关性评估失败:', error)
    return 0.5
  }
}

/**
 * 批量评估多个资料的相关性（并发处理）
 * 利用 Gemini 高并发能力，大幅提升处理速度
 *
 * @param {Array} materials - 资料列表
 * @param {string} researchTopic - 研究主题
 * @param {Array} questions - 研究问题列表
 * @param {Function} [onProgress] - 进度回调
 * @returns {Promise<Map<number, number>>} 资料索引 -> 相关性分数
 */
export async function assessRelevanceBatch(materials, researchTopic, questions, onProgress) {
  const ai = initAI()
  if (!ai) {
    // 返回默认分数
    const defaultScores = new Map()
    materials.forEach((_, idx) => defaultScores.set(idx, 0.5))
    return defaultScores
  }

  const questionsText = questions.map(q => q.question).join('\n')

  // 构建批量任务
  const tasks = materials.map((material, idx) => ({
    id: idx,
    prompt: `
研究主题：${researchTopic}

研究问题：
${questionsText}

资料标题：${material.title}
资料内容：${material.content.substring(0, 1000)}

请评估这份资料与研究主题的相关性，返回0-1之间的分数。
- 1.0: 高度相关，直接回答研究问题
- 0.7-0.9: 相关，提供有用信息
- 0.4-0.6: 部分相关
- 0.1-0.3: 弱相关
- 0: 不相关

只返回数字，不要其他内容。
`
  }))

  logger.info(`[Research] 批量评估 ${materials.length} 份资料的相关性`)

  const results = await generateBatch(ai, tasks, { onProgress })
  const scoreMap = new Map()

  for (const { id, result, error } of results) {
    if (error) {
      scoreMap.set(id, 0.5)
    } else {
      const score = parseFloat(result.trim())
      scoreMap.set(id, isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score)))
    }
  }

  return scoreMap
}

/**
 * 分析资料并提取主题
 */
export async function extractTopics(content) {
  const ai = initAI()
  if (!ai) return []

  const prompt = `
请分析以下内容，提取3-5个核心主题或关键概念。

内容：
${content.substring(0, 2000)}

请以JSON数组格式返回主题列表：
["主题1", "主题2", "主题3"]

只返回JSON数组，不要其他内容。
`

  try {
    let textResult = await generateWithRetry(ai, prompt)
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim()

    const topics = JSON.parse(textResult)
    return Array.isArray(topics) ? topics : []
  } catch (error) {
    logger.error('[Research] 主题提取失败:', error)
    return []
  }
}

/**
 * 发现资料之间的关联
 */
export async function findConnections(materials) {
  const ai = initAI()
  if (!ai) return []

  if (materials.length < 2) return []

  // 限制资料数量以避免prompt过长
  const limitedMaterials = materials.slice(0, 10)

  const materialsText = limitedMaterials.map((m, idx) =>
    `[${idx}] ${m.title}\n${m.content.substring(0, 300)}`
  ).join('\n\n')

  const prompt = `
请分析以下资料之间的关联关系：

${materialsText}

找出资料之间的关联，包括：
- 相似主题
- 引用关系
- 互补信息

请以JSON格式返回：
{
  "connections": [
    {
      "from": 0,
      "to": 1,
      "type": "similarity",
      "strength": 0.8,
      "reason": "都讨论了相同的概念"
    }
  ]
}

type可以是: similarity(相似), reference(引用), complement(互补)
strength是0-1之间的数字

只返回JSON，不要其他内容。
`

  try {
    let textResult = await generateWithRetry(ai, prompt)
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim()

    const json = JSON.parse(textResult)
    return json.connections || []
  } catch (error) {
    logger.error('[Research] 关联分析失败:', error)
    return []
  }
}

/**
 * 生成研究报告
 */
export async function generateReport(projectId) {
  const ai = initAI()
  if (!ai) return null

  // 获取项目信息
  const project = await queryOne(
    'SELECT * FROM research_projects WHERE id = ?',
    [projectId]
  )

  // 获取所有问题和答案
  const questions = await query(
    'SELECT * FROM research_questions WHERE project_id = ? ORDER BY order_index',
    [projectId]
  )

  // 获取所有资料
  const materials = await query(
    'SELECT * FROM research_materials WHERE project_id = ? ORDER BY relevance_score DESC',
    [projectId]
  )

  const questionsText = questions.map(q =>
    `Q: ${q.question}\nA: ${q.answer || '待研究'}`
  ).join('\n\n')

  const materialsText = materials.slice(0, 20).map((m, idx) =>
    `[${idx + 1}] ${m.title}\n${m.content.substring(0, 500)}`
  ).join('\n\n')

  const prompt = `
请基于以下研究内容，生成一份结构化的研究报告。

研究主题：${project.title}
研究目标：${project.description || '未指定'}

研究问题：
${questionsText}

收集的资料：
${materialsText}

请生成一份包含以下部分的研究报告：
1. 研究概述
2. 核心发现（针对每个研究问题）
3. 关键洞察
4. 参考资料

使用Markdown格式，结构清晰。
`

  try {
    const textResult = await generateWithRetry(ai, prompt)
    return textResult.trim()
  } catch (error) {
    logger.error('[Research] 报告生成失败:', error)
    return null
  }
}
