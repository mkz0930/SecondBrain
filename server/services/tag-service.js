const { query, queryOne, run } = require('../models/database')
const logger = require('../utils/logger')

/**
 * 为内容附加标签
 * @param {number} contentId - 内容 ID
 * @param {Array<string>} tagNames - 标签名称数组
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array<number>>} 附加的标签 ID 数组
 */
async function attachTagsToContent(contentId, tagNames, userId) {
  if (!tagNames || tagNames.length === 0) {
    return []
  }

  const tagIds = []

  for (const tagName of tagNames) {
    try {
      // 查找或创建标签
      let tag = await queryOne(
        'SELECT id FROM tags WHERE name = ? AND user_id = ?',
        [tagName, userId]
      )

      if (!tag) {
        logger.info(`Creating new tag: ${tagName} for user ${userId}`)
        const tagResult = await run(
          'INSERT INTO tags (name, user_id) VALUES (?, ?)',
          [tagName, userId]
        )
        tag = { id: tagResult.lastID }
      }

      // 检查是否已经关联
      const existing = await queryOne(
        'SELECT 1 FROM content_tags WHERE content_id = ? AND tag_id = ?',
        [contentId, tag.id]
      )

      if (!existing) {
        await run(
          'INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)',
          [contentId, tag.id]
        )
        logger.info(`Attached tag ${tagName} (${tag.id}) to content ${contentId}`)
      }

      tagIds.push(tag.id)

    } catch (error) {
      logger.error(`Failed to attach tag ${tagName} to content ${contentId}:`, error)
      // 继续处理其他标签
    }
  }

  return tagIds
}

/**
 * 获取内容的标签列表
 * @param {number} contentId - 内容 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array<Object>>} 标签列表
 */
async function getContentTags(contentId, userId) {
  return query(
    `SELECT t.* FROM tags t
     JOIN content_tags ct ON t.id = ct.tag_id
     WHERE ct.content_id = ? AND t.user_id = ?`,
    [contentId, userId]
  )
}

/**
 * 更新内容的标签（删除旧的，添加新的）
 * @param {number} contentId - 内容 ID
 * @param {Array<string>} tagNames - 新的标签名称数组
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array<number>>} 新的标签 ID 数组
 */
async function updateContentTags(contentId, tagNames, userId) {
  // 删除现有的标签关联
  await run(
    'DELETE FROM content_tags WHERE content_id = ?',
    [contentId]
  )

  logger.info(`Removed all tags from content ${contentId}`)

  // 添加新的标签
  return attachTagsToContent(contentId, tagNames, userId)
}

/**
 * 删除内容的所有标签
 * @param {number} contentId - 内容 ID
 * @returns {Promise<void>}
 */
async function removeContentTags(contentId) {
  await run(
    'DELETE FROM content_tags WHERE content_id = ?',
    [contentId]
  )
  logger.info(`Removed all tags from content ${contentId}`)
}

/**
 * 查找或创建标签
 * @param {string} tagName - 标签名称
 * @param {number} userId - 用户 ID
 * @param {string} [color] - 标签颜色
 * @returns {Promise<Object>} 标签对象
 */
async function findOrCreateTag(tagName, userId, color = null) {
  let tag = await queryOne(
    'SELECT * FROM tags WHERE name = ? AND user_id = ?',
    [tagName, userId]
  )

  if (!tag) {
    logger.info(`Creating new tag: ${tagName} for user ${userId}`)
    const result = await run(
      'INSERT INTO tags (name, user_id, color) VALUES (?, ?, ?)',
      [tagName, userId, color]
    )
    tag = {
      id: result.lastID,
      name: tagName,
      user_id: userId,
      color
    }
  }

  return tag
}

/**
 * 获取用户的所有标签
 * @param {number} userId - 用户 ID
 * @returns {Promise<Array<Object>>} 标签列表
 */
async function getUserTags(userId) {
  return query(
    'SELECT * FROM tags WHERE user_id = ? ORDER BY name',
    [userId]
  )
}

/**
 * 删除未使用的标签
 * @param {number} userId - 用户 ID
 * @returns {Promise<number>} 删除的标签数量
 */
async function cleanupUnusedTags(userId) {
  const result = await run(
    `DELETE FROM tags
     WHERE user_id = ?
     AND id NOT IN (SELECT DISTINCT tag_id FROM content_tags)`,
    [userId]
  )

  logger.info(`Cleaned up ${result.changes} unused tags for user ${userId}`)
  return result.changes
}

module.exports = {
  attachTagsToContent,
  getContentTags,
  updateContentTags,
  removeContentTags,
  findOrCreateTag,
  getUserTags,
  cleanupUnusedTags
}
