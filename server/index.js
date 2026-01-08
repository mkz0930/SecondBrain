import express from 'express'
import cors from 'cors'
import contentsRouter from './routes/contents.js'
import tagsRouter from './routes/tags.js'
import statsRouter from './routes/stats.js'
import authRouter from './routes/auth.js'
import { initDatabase } from './models/database.js'
import { ensureDefaultUser, backfillUserOwnership, ensureDefaultAdmin } from './models/users.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
