import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import contentsRouter from './routes/contents.js'
import tagsRouter from './routes/tags.js'
import statsRouter from './routes/stats.js'
import authRouter from './routes/auth.js'
import feishuRouter from './routes/feishu.js'
import dailySummaryRouter from './routes/daily-summary.js'
import researchRouter from './routes/research.js'
import graphRouter from './routes/graph.js'
import databaseRouter from './routes/database.js'
import uploadRouter from './routes/upload.js'
import { initDatabase } from './models/database.js'
import { ensureDefaultUser, backfillUserOwnership, ensureDefaultAdmin } from './models/users.js'
import { startSyncScheduler } from './services/sync-scheduler.js'
import { startDailyScheduler } from './services/daily-scheduler.js'
import { dailySummaryService } from './services/daily-summary-service.js'
import logger from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// 静态文件服务 - 提供上传的文件访问
app.use('/uploads', express.static(join(__dirname, '../uploads')))

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`)
  next()
})

await initDatabase()

if (process.env.DISABLE_ANON !== 'true') {
  const defaultUser = await ensureDefaultUser()
  await backfillUserOwnership(defaultUser.id)
}

await ensureDefaultAdmin()

app.use('/api/auth', authRouter)
app.use('/api/contents', contentsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/feishu', feishuRouter)
app.use('/api/daily-summary', dailySummaryRouter)
app.use('/api/research', researchRouter)
app.use('/api/graph', graphRouter)
app.use('/api/database', databaseRouter)
app.use('/api/upload', uploadRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`)
  
  // 启动飞书同步定时任务
  if (process.env.FEISHU_SYNC_ENABLED !== 'false') {
    logger.info('[SyncScheduler] Starting Feishu sync scheduler...')
    startSyncScheduler()
  } else {
    logger.info('[SyncScheduler] Feishu sync scheduler is disabled')
  }

  // 启动日报生成定时任务
  startDailyScheduler();
  
  // 自动初始化所有历史日报 (后台运行)
  logger.info('[DailySummary] Starting background initialization of past summaries...');
  dailySummaryService.initializeAll().catch(err => {
    logger.error('[DailySummary] Initialization failed:', err);
  });
})
