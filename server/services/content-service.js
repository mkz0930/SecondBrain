const { query, queryOne, run } = require('../models/database')
const logger = require('../utils/logger')
const { getContentTags } = require('./tag-service')

/**
 * 计算智能评分
 * @param {Object} params - 评分参数
 * @param {number} params.accessCount - 访问次数
 * @param {number} params.annotationCount - 批注数量
 * @param {boolean} params.isFavorite - 是否收藏
 * @param {number} params.contentLength - 内容长度
 * @returns {number} 智能评分（0-100）
 */
function computeSmartRating({ accessCount, annotationCount, isFavorite, contentLength }) {
  let score = 0

  // 访问次数权重：40%
  score += Math.min(accessCount * 2, 40)

  // 批注数量权重：30%
  score += Math.min(annotationCount * 5, 30)

  // 收藏权重：20%
  if (isFavorite) {
    score += 20
  }

  // 内容长度权重：10%
  if (contentLength > 1000) {
    score += 10
  } else if (contentLength > 500) {
    score += 5
  }

  return Math.min(Math.round(score), 100)
}

/**
 * 丰富内容对象（添加标签、访问次数、智能评分等）
 * @param {Object} content - 内容对象
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>} 丰富后的内容对象
 */
async function enrichContent(content, userId) {
  if (!content) return null

  // 获取标签
  const tags = await getContentTags(content.id, userId)

  // 获取访问次数
  const accessCountRow = await queryOne(
    'SELECT COUNT(*) as count FROM access_logs WHERE content_id = ?',
    [content.id]
  )
  const accessCount = Number(accessCountRow?.count) || 0

  // 获取批注数量
  const annotationCountRow = await queryOne(
    'SELECT COUNT(*) as count FROM annotations WHERE content_id = ?',
    [content.id]
  )
  const annotationCount = Number(annotationCountRow?.count) || 0

  // 计算内容长度
  const contentLength = (content.title || '').length + (content.content || '').length

  // 计算智能评分
  const smartRating = computeSmartRating({
    accessCount,
    annotationCount,
    isFavorite: Boolean(content.is_favorite),
    contentLength
  })

  // 丰富内容对象
  return {
    ...content,
    tags,
    is_favorite: Boolean(content.is_favorite),
    access_count: accessCount,
    annotation_count: annotationCount,
    content_length: contentLength,
    smart_rating: smartRating
  }
}

/**
 * 批量丰富内容对象
 * @param {Array<Object>} contents - 内容对象数组
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array<Object>>} 丰富后的内容对象数组
 */
async function enrichContents(contents, userId) {
  if (!contents || contents.length === 0) {
    return []
  }

  // 并行处理所有内容
  return await Promise.all(
    contents.map(content => enrichContent(content, userId))
  )
}

/**
 * 验证内容所有权
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object|null>} 内容对象或 null
 */
async function verifyContentOwnership(contentId, userId) {
  return await queryOne(
    'SELECT * FROM contents WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [contentId, userId]
  )
}

/**
 * 记录内容访问
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<void>}
 */
async function logContentAccess(contentId, userId) {
  try {
    await run(
      'INSERT INTO access_logs (content_id, user_id, accessed_at) VALUES (?, ?, datetime("now"))',
      [contentId, userId]
    )
    logger.debug(`Logged access for content ${contentId} by user ${userId}`)
  } catch (error) {
    logger.error(`Failed to log access for content ${contentId}:`, error)
    // 不抛出错误，访问日志失败不应影响主流程
  }
}

/**
 * 软删除内容
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<boolean>} 是否成功删除
 */
async function softDeleteContent(contentId, userId) {
  const result = await run(
    'UPDATE contents SET deleted_at = datetime("now") WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
    [contentId, userId]
  )

  if (result.changes > 0) {
    logger.info(`Soft deleted content ${contentId} by user ${userId}`)
    return true
  }

  return false
}

/**
 * 恢复已删除的内容
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<boolean>} 是否成功恢复
 */
async function restoreContent(contentId, userId) {
  const result = await run(
    'UPDATE contents SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
    [contentId, userId]
  )

  if (result.changes > 0) {
    logger.info(`Restored content ${contentId} by user ${userId}`)
    return true
  }

  return false
}

/**
 * 永久删除内容
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<boolean>} 是否成功删除
 */
async function permanentDeleteContent(contentId, userId) {
  // 删除关联的标签
  await run('DELETE FROM content_tags WHERE content_id = ?', [contentId])

  // 删除访问日志
  await run('DELETE FROM access_logs WHERE content_id = ?', [contentId])

  // 删除批注
  await run('DELETE FROM annotations WHERE content_id = ?', [contentId])

  // 删除内容
  const result = await run(
    'DELETE FROM contents WHERE id = ? AND user_id = ?',
    [contentId, userId]
  )

  if (result.changes > 0) {
    logger.info(`Permanently deleted content ${contentId} by user ${userId}`)
    return true
  }

  return false
}

/**
 * 切换收藏状态
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<boolean>} 新的收藏状态
 */
async function toggleFavorite(contentId, userId) {
  const content = await verifyContentOwnership(contentId, userId)
  if (!content) {
    throw new Error('Content not found')
  }

  const newFavoriteStatus = !content.is_favorite

  await run(
    'UPDATE contents SET is_favorite = ? WHERE id = ?',
    [newFavoriteStatus ? 1 : 0, contentId]
  )

  logger.info(`Toggled favorite for content ${contentId} to ${newFavoriteStatus}`)
  return newFavoriteStatus
}

/**
 * 更新内容评分
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @param {number} rating - 评分（1-5）
 * @returns {Promise<void>}
 */
async function updateRating(contentId, userId, rating) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  const content = await verifyContentOwnership(contentId, userId)
  if (!content) {
    throw new Error('Content not found')
  }

  await run(
    'UPDATE contents SET rating = ? WHERE id = ?',
    [rating, contentId]
  )

  logger.info(`Updated rating for content ${contentId} to ${rating}`)
}

module.exports = {
  computeSmartRating,
  enrichContent,
  enrichContents,
  verifyContentOwnership,
  logContentAccess,
  softDeleteContent,
  restoreContent,
  permanentDeleteContent,
  toggleFavorite,
  updateRating
}
