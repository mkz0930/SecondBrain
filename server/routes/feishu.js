import express from 'express'
import { query, queryOne, run } from '../models/database.js'
import { requireUser } from '../middleware/auth.js'
import { SyncService } from '../services/sync-service.js'
import { FeishuAdapter, encryptSecret, decryptSecret } from '../services/feishu-adapter.js'
import { syncState } from '../services/sync-state.js'
import logger from '../utils/logger.js'

const router = express.Router()
router.use(requireUser)

// 获取加密密钥
const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me'

/**
 * 获取飞书配置
 */
router.get('/config', async (req, res) => {
  try {
    const config = await queryOne(
      'SELECT id, app_id, table_id, enabled, sync_interval, updated_at FROM feishu_sync_config WHERE user_id = ?',
      [req.user.id]
    )

    if (!config) {
      return res.json({
        configured: false,
        message: 'Feishu integration not configured'
      })
    }

    // 获取最后同步时间
    const lastSync = await queryOne(
      'SELECT start_at FROM feishu_sync_log WHERE user_id = ? ORDER BY start_at DESC LIMIT 1',
      [req.user.id]
    )

    res.json({
      configured: true,
      app_id: config.app_id,
      table_id: config.table_id,
      sync_interval: config.sync_interval,
      enabled: Boolean(config.enabled),
      last_sync_at: lastSync ? lastSync.start_at : null
    })
  } catch (error) {
    console.error('[FeishuAPI] Get config error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 保存飞书配置
 */
router.post('/config', async (req, res) => {
  try {
    const { app_id, app_secret, table_id, sync_interval = 15 } = req.body

    if (!app_id || !app_secret || !table_id) {
      return res.status(400).json({ error: 'app_id, app_secret and table_id are required' })
    }

    console.log(`[FeishuAPI] Saving config for user ${req.user.id}`)

    // 加密app_secret
    const encryptedSecret = encryptSecret(app_secret, ENCRYPTION_KEY)

    // 测试连接
    const adapter = new FeishuAdapter({
      app_id,
      app_secret,
      logger: logger
    })

    try {
      const tokenInfo = await adapter.refreshAccessToken()
      logger.info('[FeishuAPI] Connection test successful')

      // 检查是否已有配置
      const existing = await queryOne(
        'SELECT id FROM feishu_sync_config WHERE user_id = ?',
        [req.user.id]
      )

      if (existing) {
        // 更新配置
        await run(
          `UPDATE feishu_sync_config 
           SET app_id = ?, app_secret = ?, table_id = ?, sync_interval = ?, 
               access_token = ?, token_expires_at = ?, updated_at = ?
           WHERE user_id = ?`,
          [
            app_id,
            encryptedSecret,
            table_id,
            sync_interval,
            tokenInfo.access_token,
            tokenInfo.expires_at.toISOString(),
            new Date().toISOString(),
            req.user.id
          ]
        )

        console.log('[FeishuAPI] Config updated')
        res.json({
          message: 'Configuration updated successfully',
          config_id: existing.id
        })
      } else {
        // 新增配置
        const result = await run(
          `INSERT INTO feishu_sync_config 
           (user_id, app_id, app_secret, table_id, sync_interval, access_token, token_expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            app_id,
            encryptedSecret,
            table_id,
            sync_interval,
            tokenInfo.access_token,
            tokenInfo.expires_at.toISOString()
          ]
        )

        console.log('[FeishuAPI] Config created')
        res.json({
          message: 'Configuration saved successfully',
          config_id: result.lastID
        })
      }
    } catch (error) {
      console.error('[FeishuAPI] Connection test failed:', error.message)
      return res.status(400).json({ 
        error: 'Failed to connect to Feishu API',
        details: error.message 
      })
    }
  } catch (error) {
    console.error('[FeishuAPI] Save config error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 测试飞书连接
 */
router.post('/config/test', async (req, res) => {
  try {
    const { app_id, app_secret, table_id } = req.body

    if (!app_id || !app_secret || !table_id) {
      return res.status(400).json({ error: 'app_id, app_secret and table_id are required' })
    }

    logger.info('[FeishuAPI] Testing connection...')

    const adapter = new FeishuAdapter({
      app_id,
      app_secret,
      logger: logger
    })

    await adapter.refreshAccessToken()

    // 尝试获取表格信息
    const [appToken, tableIdPart] = table_id.split('_')
    const tables = await adapter.listTables(appToken)
    
    const targetTable = tables.items.find(t => t.table_id === tableIdPart)
    
    res.json({
      success: true,
      message: 'Connection successful',
      table_name: targetTable ? targetTable.name : 'Unknown'
    })
  } catch (error) {
    console.error('[FeishuAPI] Test connection error:', error)
    res.status(400).json({ 
      success: false,
      error: error.message 
    })
  }
})

/**
 * 启用/禁用同步
 */
router.post('/config/toggle', async (req, res) => {
  try {
    const { enabled } = req.body

    await run(
      'UPDATE feishu_sync_config SET enabled = ?, updated_at = ? WHERE user_id = ?',
      [enabled ? 1 : 0, new Date().toISOString(), req.user.id]
    )

    console.log(`[FeishuAPI] Sync ${enabled ? 'enabled' : 'disabled'} for user ${req.user.id}`)
    
    res.json({
      message: `Sync ${enabled ? 'enabled' : 'disabled'} successfully`
    })
  } catch (error) {
    console.error('[FeishuAPI] Toggle sync error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 手动触发同步
 */
router.post('/sync', async (req, res) => {
  try {
    const { direction = 'both', forceUpdate = false } = req.body

    console.log(`[FeishuAPI] Manual sync triggered by user ${req.user.id}, direction: ${direction}, forceUpdate: ${forceUpdate}`)

    // 获取配置
    const config = await queryOne(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [req.user.id]
    )

    if (!config) {
      console.warn(`[FeishuAPI] Sync failed: Config not found or disabled for user ${req.user.id}`)
      // Check if config exists but is disabled
      const disabledConfig = await queryOne(
        'SELECT * FROM feishu_sync_config WHERE user_id = ?',
        [req.user.id]
      )
      if (disabledConfig) {
        console.warn(`[FeishuAPI] Config exists but enabled=${disabledConfig.enabled}`)
      } else {
        console.warn(`[FeishuAPI] No config found for user ${req.user.id}`)
      }
      return res.status(400).json({ error: 'Feishu sync not configured or disabled' })
    }

    // 解密app_secret
    const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY)

    // 创建同步服务并执行同步
    const syncService = new SyncService({
      user_id: req.user.id,
      table_id: config.table_id,
      app_id: config.app_id,
      app_secret: appSecret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at
    }, logger)

    // 异步执行同步
    syncService.performSync('manual', direction, { forceUpdate })
      .then(result => {
        logger.info(`[FeishuAPI] Sync completed for user ${req.user.id}:`, result)
      })
      .catch(error => {
        logger.error(`[FeishuAPI] Sync failed for user ${req.user.id}:`, error)
      })

    // 立即返回响应
    res.json({
      message: 'Sync started',
      status: 'running'
    })
  } catch (error) {
    console.error('[FeishuAPI] Trigger sync error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取同步历史
 */
router.get('/sync/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const logs = await query(
      `SELECT id, sync_type, start_at, end_at, status, total_count, 
              success_count, failed_count, conflict_count, error_message
       FROM feishu_sync_log 
       WHERE user_id = ? 
       ORDER BY start_at DESC 
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit, 10), parseInt(offset, 10)]
    )

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM feishu_sync_log WHERE user_id = ?',
      [req.user.id]
    )

    res.json({
      data: logs,
      total: countResult.total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    })
  } catch (error) {
    console.error('[FeishuAPI] Get history error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取同步日志详情
 */
router.get('/sync/log/:id', async (req, res) => {
  try {
    const { id } = req.params

    const log = await queryOne(
      'SELECT * FROM feishu_sync_log WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )

    if (!log) {
      return res.status(404).json({ error: 'Log not found' })
    }

    // 解析详情JSON
    if (log.details) {
      try {
        log.details = JSON.parse(log.details)
      } catch (e) {
        log.details = []
      }
    }

    res.json(log)
  } catch (error) {
    console.error('[FeishuAPI] Get log detail error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 全量导入到飞书
 */
router.post('/import-all', async (req, res) => {
  try {
    console.log(`[FeishuAPI] Full import triggered by user ${req.user.id}`)

    // 获取配置
    const config = await queryOne(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [req.user.id]
    )

    if (!config) {
      return res.status(400).json({ error: 'Feishu sync not configured or disabled' })
    }

    // 获取所有本地内容数量
    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM contents WHERE user_id = ? AND deleted_at IS NULL',
      [req.user.id]
    )

    // 解密app_secret
    const appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY)

    // 创建同步服务并执行全量推送
    const syncService = new SyncService({
      user_id: req.user.id,
      table_id: config.table_id,
      app_id: config.app_id,
      app_secret: appSecret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at
    }, logger)

    // 异步执行
    syncService.performSync('manual', 'push')
      .then(result => {
        logger.info(`[FeishuAPI] Full import completed for user ${req.user.id}:`, result)
      })
      .catch(error => {
        logger.error(`[FeishuAPI] Full import failed for user ${req.user.id}:`, error)
      })

    res.json({
      message: 'Import started',
      status: 'running',
      total_count: countResult.total
    })
  } catch (error) {
    console.error('[FeishuAPI] Import all error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 重置本地数据并全量拉取
 */
router.post('/reset-pull', async (req, res) => {
  try {
    console.log(`[FeishuAPI] Reset and Pull triggered by user ${req.user.id}`)

    // 获取配置
    const config = await queryOne(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [req.user.id]
    )

    if (!config) {
      return res.status(400).json({ error: 'Feishu sync not configured or disabled' })
    }

    // 解密app_secret
    let appSecret
    try {
      appSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY)
    } catch (e) {
      console.error('[FeishuAPI] Decrypt secret failed:', e)
      return res.status(500).json({ error: 'Failed to decrypt app secret' })
    }

    // 创建同步服务
    const syncService = new SyncService({
      user_id: req.user.id,
      table_id: config.table_id,
      app_id: config.app_id,
      app_secret: appSecret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at
    }, logger)

    // 清空本地数据
    try {
      await syncService.clearLocalData()
    } catch (e) {
      logger.error('[FeishuAPI] Clear local data failed:', e)
      return res.status(500).json({ error: 'Failed to clear local data: ' + e.message })
    }

    // 强制全量拉取
    // 注意：performSync 是异步的，这里不等待它完成
    syncService.performSync('manual', 'pull', true)
      .then(result => {
        logger.info(`[FeishuAPI] Reset and Pull completed for user ${req.user.id}:`, result)
      })
      .catch(error => {
        logger.error(`[FeishuAPI] Reset and Pull failed for user ${req.user.id}:`, error)
      })

    res.json({
      message: 'Reset and Pull started',
      status: 'running',
      server_version: 'fixed-v1'
    })
  } catch (error) {
    console.error('[FeishuAPI] Reset and Pull error:', error)
    // 打印完整的错误堆栈
    console.error(error.stack)
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

/**
 * 获取当前同步状态
 */
router.get('/sync/status', (req, res) => {
  const status = syncState.get(req.user.id)
  res.json(status)
})

/**
 * 代理下载飞书附件
 * 前端无法直接访问飞书 API，需要通过后端代理
 */
router.get('/attachment/:fileToken', async (req, res) => {
  try {
    const { fileToken } = req.params

    if (!fileToken) {
      return res.status(400).json({ error: 'Missing file token' })
    }

    // 获取用户的飞书配置
    const config = await queryOne(
      'SELECT app_id, app_secret, access_token, token_expires_at FROM feishu_sync_config WHERE user_id = ?',
      [req.user.id]
    )

    if (!config) {
      return res.status(404).json({ error: 'Feishu not configured' })
    }

    // 解密 app_secret
    const decryptedSecret = decryptSecret(config.app_secret, ENCRYPTION_KEY)

    // 创建飞书适配器
    const adapter = new FeishuAdapter({
      app_id: config.app_id,
      app_secret: decryptedSecret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at,
      logger
    })

    // 下载文件
    const { data, contentType } = await adapter.downloadMedia(fileToken)

    // 更新 token（如果刷新了）
    if (adapter.accessToken !== config.access_token) {
      await run(
        'UPDATE feishu_sync_config SET access_token = ?, token_expires_at = ? WHERE user_id = ?',
        [adapter.accessToken, adapter.tokenExpiresAt.toISOString(), req.user.id]
      )
    }

    // 设置缓存头（附件可以缓存较长时间）
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    })

    res.send(Buffer.from(data))
  } catch (error) {
    logger.error('[FeishuAPI] Attachment proxy error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
