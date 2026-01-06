import express from 'express'
import cors from 'cors'
import contentsRouter from './routes/contents.js'
import tagsRouter from './routes/tags.js'
import statsRouter from './routes/stats.js'
import { initDatabase } from './models/database.js'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 初始化数据库
await initDatabase()

// 路由
app.use('/api/contents', contentsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/stats', statsRouter)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
