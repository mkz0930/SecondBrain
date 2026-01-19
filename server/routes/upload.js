import express from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { mkdir } from 'fs/promises'
import { requireUser } from '../middleware/auth.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
router.use(requireUser)

// 确保上传目录存在
const uploadsDir = join(__dirname, '../../uploads')
try {
  await mkdir(uploadsDir, { recursive: true })
} catch (err) {
  logger.error('Failed to create uploads directory:', err)
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳-用户ID-原始文件名
    const uniqueSuffix = Date.now() + '-' + req.user.id
    const ext = extname(file.originalname)
    const nameWithoutExt = file.originalname.replace(ext, '')
    cb(null, uniqueSuffix + '-' + nameWithoutExt + ext)
  }
})

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = [
    // 图片
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // 文本
    'text/plain', 'text/markdown', 'text/csv',
    // 压缩文件
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    // 音视频
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 限制
  }
})

// 上传单个文件
router.post('/single', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const fileInfo = {
      name: req.file.originalname,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype,
      size: req.file.size
    }

    logger.info(`File uploaded successfully: ${req.file.originalname} by user ${req.user.id}`)
    res.json(fileInfo)
  } catch (error) {
    logger.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 上传多个文件
router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const filesInfo = req.files.map(file => ({
      name: file.originalname,
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      type: file.mimetype,
      size: file.size
    }))

    logger.info(`${req.files.length} files uploaded successfully by user ${req.user.id}`)
    res.json(filesInfo)
  } catch (error) {
    logger.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大 50MB）' })
    }
    return res.status(400).json({ error: error.message })
  }
  next(error)
})

export default router
