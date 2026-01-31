import express from 'express'
import graphService from '../services/graph-service.js'
import logger from '../utils/logger.js'
import { requireUser } from '../middleware/auth.js'

const router = express.Router()
router.use(requireUser)

/**
 * 获取知识图谱数据
 * GET /api/graph/data
 * Query params:
 *   - contentTypes: 内容类型数组 (可选)
 *   - tagIds: 标签ID数组 (可选)
 *   - startDate: 开始日期 (可选)
 *   - endDate: 结束日期 (可选)
 *   - minConnections: 最小连接数 (可选，默认0)
 */
router.get('/data', async (req, res) => {
  try {
    const userId = req.user.id

    // 解析查询参数
    const options = {
      contentTypes: req.query.contentTypes ? JSON.parse(req.query.contentTypes) : [],
      tagIds: req.query.tagIds ? JSON.parse(req.query.tagIds) : [],
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      minConnections: parseInt(req.query.minConnections) || 0
    }

    logger.info(`Fetching graph data for user ${userId} with options:`, options)

    const graphData = await graphService.getGraphData(userId, options)

    res.json({
      success: true,
      data: graphData
    })
  } catch (error) {
    logger.error('Error fetching graph data:', error)
    res.status(500).json({
      success: false,
      message: '获取图谱数据失败',
      error: error.message
    })
  }
})

/**
 * 获取节点详情
 * GET /api/graph/node/:nodeId
 */
router.get('/node/:nodeId', async (req, res) => {
  try {
    const userId = req.user.id
    const { nodeId } = req.params

    logger.info(`Fetching node detail for user ${userId}, node ${nodeId}`)

    const nodeDetail = await graphService.getNodeDetail(userId, nodeId)

    if (!nodeDetail) {
      return res.status(404).json({
        success: false,
        message: '节点不存在'
      })
    }

    res.json({
      success: true,
      data: nodeDetail
    })
  } catch (error) {
    logger.error('Error fetching node detail:', error)
    res.status(500).json({
      success: false,
      message: '获取节点详情失败',
      error: error.message
    })
  }
})

/**
 * 获取相关节点推荐
 * GET /api/graph/related/:nodeId
 * Query params:
 *   - limit: 返回数量限制 (可选，默认10)
 */
router.get('/related/:nodeId', async (req, res) => {
  try {
    const userId = req.user.id
    const { nodeId } = req.params
    const limit = parseInt(req.query.limit) || 10

    logger.info(`Fetching related nodes for user ${userId}, node ${nodeId}, limit ${limit}`)

    const relatedNodes = await graphService.getRelatedNodes(userId, nodeId, limit)

    res.json({
      success: true,
      data: relatedNodes
    })
  } catch (error) {
    logger.error('Error fetching related nodes:', error)
    res.status(500).json({
      success: false,
      message: '获取相关节点失败',
      error: error.message
    })
  }
})

/**
 * 获取图谱统计信息
 * GET /api/graph/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id

    logger.info(`Fetching graph stats for user ${userId}`)

    const graphData = await graphService.getGraphData(userId, {})

    res.json({
      success: true,
      data: {
        totalNodes: graphData.nodes.length,
        totalEdges: graphData.edges.length,
        contentCount: graphData.stats.contentCount,
        tagCount: graphData.stats.tagCount,
        avgConnections: graphData.nodes.length > 0
          ? (graphData.edges.length / graphData.nodes.length).toFixed(2)
          : 0
      }
    })
  } catch (error) {
    logger.error('Error fetching graph stats:', error)
    res.status(500).json({
      success: false,
      message: '获取图谱统计失败',
      error: error.message
    })
  }
})

export default router
