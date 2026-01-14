import cron from 'node-cron'
import { query, queryOne } from '../models/database.js'
import { SyncService } from './sync-service.js'
import { decryptSecret } from './feishu-adapter.js'

/**
 * 飞书同步定时任务调度器
 */

const ENCRYPTION_KEY = process.env.FEISHU_ENCRYPTION_KEY || 'default-encryption-key-change-me'
const activeJobs = new Map()
const failureCounters = new Map()
const MAX_CONSECUTIVE_FAILURES = 3

/**
 * 启动同步调度器
 */
export function startSyncScheduler() {
  console.log('[SyncScheduler] Initializing sync scheduler...')
  
  // 延迟 2 分钟启动首次加载，避免服务器启动或用户刚登录时立即触发同步导致卡顿
  const STARTUP_DELAY = 2 * 60 * 1000 
  
  console.log(`[SyncScheduler] Scheduler will start in ${STARTUP_DELAY/1000} seconds to avoid startup lag...`)
  
  setTimeout(() => {
    console.log('[SyncScheduler] Starting initial config load...')
    loadAllUserConfigs()
    
    // 每5分钟重新加载配置（检测新增或修改的配置）
    cron.schedule('*/5 * * * *', () => {
      console.log('[SyncScheduler] Reloading user configurations...')
      loadAllUserConfigs()
    })
  }, STARTUP_DELAY)
  
  console.log('[SyncScheduler] Sync scheduler initialization completed (waiting for delay)')
}

/**
 * 加载所有用户的同步配置
 */
async function loadAllUserConfigs() {
  try {
    const configs = await query(
      'SELECT * FROM feishu_sync_config WHERE enabled = 1'
    )
    
    console.log(`[SyncScheduler] Found ${configs.length} enabled sync configurations`)
    
    for (const config of configs) {
      setupUserSync(config)
    }
    
    // 停止已禁用或删除的配置
    for (const [userId, job] of activeJobs.entries()) {
      const stillActive = configs.some(c => c.user_id === userId)
      if (!stillActive) {
        console.log(`[SyncScheduler] Stopping sync for user ${userId} (config disabled or removed)`)
        job.stop()
        activeJobs.delete(userId)
        failureCounters.delete(userId)
      }
    }
  } catch (error) {
    console.error('[SyncScheduler] Failed to load user configs:', error)
  }
}

/**
 * 为单个用户设置同步任务
 */
function setupUserSync(config) {
  const userId = config.user_id
  const interval = config.sync_interval || 15
  
  // 如果已存在任务，先停止
  if (activeJobs.has(userId)) {
    const existingJob = activeJobs.get(userId)
    existingJob.stop()
    console.log(`[SyncScheduler] Updating sync schedule for user ${userId}`)
  } else {
    console.log(`[SyncScheduler] Setting up sync for user ${userId}, interval: ${interval} minutes`)
  }
  
  // 创建cron表达式：每N分钟执行一次
  const cronExpression = `*/${interval} * * * *`
  
  // 创建定时任务
  const job = cron.schedule(cronExpression, async () => {
    await executeSyncForUser(config)
  })
  
  activeJobs.set(userId, job)
  
  // 重置失败计数
  if (!failureCounters.has(userId)) {
    failureCounters.set(userId, 0)
  }
}

/**
 * 执行单个用户的同步
 */
async function executeSyncForUser(config) {
  const userId = config.user_id
  
  try {
    console.log(`[SyncScheduler] Starting auto sync for user ${userId}`)
    
    // 检查配置是否仍然启用
    const currentConfig = await queryOne(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [userId]
    )
    
    if (!currentConfig) {
      console.log(`[SyncScheduler] Sync disabled for user ${userId}, stopping job`)
      const job = activeJobs.get(userId)
      if (job) {
        job.stop()
        activeJobs.delete(userId)
        failureCounters.delete(userId)
      }
      return
    }
    
    // 解密app_secret
    const appSecret = decryptSecret(currentConfig.app_secret, ENCRYPTION_KEY)
    
    // 创建同步服务
    const syncService = new SyncService({
      user_id: userId,
      table_id: currentConfig.table_id,
      app_id: currentConfig.app_id,
      app_secret: appSecret,
      access_token: currentConfig.access_token,
      token_expires_at: currentConfig.token_expires_at
    }, console)
    
    // 执行同步
    const result = await syncService.performSync('auto', 'both')
    
    console.log(`[SyncScheduler] Auto sync completed for user ${userId}:`, {
      total: result.total,
      success: result.success,
      failed: result.failed,
      conflicts: result.conflicts
    })
    
    // 重置失败计数
    failureCounters.set(userId, 0)
    
  } catch (error) {
    console.error(`[SyncScheduler] Auto sync failed for user ${userId}:`, error.message)
    
    // 增加失败计数
    const failureCount = (failureCounters.get(userId) || 0) + 1
    failureCounters.set(userId, failureCount)
    
    console.log(`[SyncScheduler] Failure count for user ${userId}: ${failureCount}/${MAX_CONSECUTIVE_FAILURES}`)
    
    // 连续失败超过阈值，禁用自动同步
    if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[SyncScheduler] User ${userId} has failed ${failureCount} times, disabling auto sync`)
      
      try {
        await query(
          'UPDATE feishu_sync_config SET enabled = 0, updated_at = ? WHERE user_id = ?',
          [new Date().toISOString(), userId]
        )
        
        // 停止任务
        const job = activeJobs.get(userId)
        if (job) {
          job.stop()
          activeJobs.delete(userId)
        }
        
        failureCounters.delete(userId)
        
        console.log(`[SyncScheduler] Auto sync disabled for user ${userId} due to consecutive failures`)
      } catch (dbError) {
        console.error(`[SyncScheduler] Failed to disable sync for user ${userId}:`, dbError)
      }
    }
  }
}

/**
 * 停止所有同步任务
 */
export function stopSyncScheduler() {
  console.log('[SyncScheduler] Stopping all sync jobs...')
  
  for (const [userId, job] of activeJobs.entries()) {
    job.stop()
    console.log(`[SyncScheduler] Stopped sync for user ${userId}`)
  }
  
  activeJobs.clear()
  failureCounters.clear()
  
  console.log('[SyncScheduler] All sync jobs stopped')
}

/**
 * 获取当前活跃的同步任务信息
 */
export function getActiveJobs() {
  const jobs = []
  for (const userId of activeJobs.keys()) {
    jobs.push({
      user_id: userId,
      failure_count: failureCounters.get(userId) || 0
    })
  }
  return jobs
}

export default {
  startSyncScheduler,
  stopSyncScheduler,
  getActiveJobs
}
