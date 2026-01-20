import { expect } from 'chai'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import contentsRouter from '../../server/routes/contents.js'

describe('Contents API 测试', () => {
  let app
  let authToken

  before(() => {
    // 创建测试应用
    app = express()
    app.use(cors())
    app.use(express.json())

    // 模拟认证中间件
    app.use((req, res, next) => {
      req.user = { id: 1, username: 'test_user' }
      next()
    })

    app.use('/api/contents', contentsRouter)
  })

  describe('GET /api/contents', () => {
    it('应该返回内容列表', async () => {
      const res = await request(app)
        .get('/api/contents')
        .expect(200)

      expect(res.body).to.have.property('success', true)
      expect(res.body).to.have.property('data')
      expect(res.body.data).to.be.an('array')
    })

    it('应该支持分页参数', async () => {
      const res = await request(app)
        .get('/api/contents?page=1&limit=10')
        .expect(200)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.length.at.most(10)
    })

    it('应该支持类型筛选', async () => {
      const res = await request(app)
        .get('/api/contents?type=文章')
        .expect(200)

      expect(res.body.success).to.be.true
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('type', '文章')
      }
    })

    it('应该支持搜索功能', async () => {
      const res = await request(app)
        .get('/api/contents?search=测试')
        .expect(200)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.be.an('array')
    })
  })

  describe('POST /api/contents', () => {
    it('应该创建新内容', async () => {
      const newContent = {
        title: '测试内容',
        content: '这是一个测试内容',
        type: '随笔',
        url: 'https://example.com',
        tags: ['测试', '自动化']
      }

      const res = await request(app)
        .post('/api/contents')
        .send(newContent)
        .expect(201)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('id')
      expect(res.body.data).to.have.property('title', newContent.title)
    })

    it('应该验证必填字段', async () => {
      const invalidContent = {
        content: '缺少标题'
      }

      const res = await request(app)
        .post('/api/contents')
        .send(invalidContent)
        .expect(400)

      expect(res.body.success).to.be.false
      expect(res.body).to.have.property('message')
    })

    it('应该支持 AI 分析', async () => {
      const content = {
        title: '需要分析的内容',
        content: '这是一段需要 AI 分析的长文本内容...',
        analyze: true
      }

      const res = await request(app)
        .post('/api/contents')
        .send(content)
        .expect(201)

      expect(res.body.success).to.be.true
      // AI 分析可能会添加摘要和标签
      if (res.body.data.summary) {
        expect(res.body.data.summary).to.be.a('string')
      }
    })
  })

  describe('GET /api/contents/:id', () => {
    it('应该返回指定内容', async () => {
      // 先创建一个内容
      const createRes = await request(app)
        .post('/api/contents')
        .send({
          title: '测试内容详情',
          content: '内容正文',
          type: '随笔'
        })

      const contentId = createRes.body.data.id

      const res = await request(app)
        .get(`/api/contents/${contentId}`)
        .expect(200)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('id', contentId)
      expect(res.body.data).to.have.property('title', '测试内容详情')
    })

    it('应该返回 404 当内容不存在', async () => {
      const res = await request(app)
        .get('/api/contents/99999')
        .expect(404)

      expect(res.body.success).to.be.false
    })
  })

  describe('PUT /api/contents/:id', () => {
    it('应该更新内容', async () => {
      // 先创建一个内容
      const createRes = await request(app)
        .post('/api/contents')
        .send({
          title: '原始标题',
          content: '原始内容',
          type: '随笔'
        })

      const contentId = createRes.body.data.id

      const updateData = {
        title: '更新后的标题',
        content: '更新后的内容',
        rating: 5
      }

      const res = await request(app)
        .put(`/api/contents/${contentId}`)
        .send(updateData)
        .expect(200)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('title', updateData.title)
      expect(res.body.data).to.have.property('rating', updateData.rating)
    })

    it('应该更新 updated_at 时间戳', async () => {
      const createRes = await request(app)
        .post('/api/contents')
        .send({
          title: '测试时间戳',
          content: '内容',
          type: '随笔'
        })

      const contentId = createRes.body.data.id
      const originalUpdatedAt = createRes.body.data.updated_at

      // 等待一秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1000))

      const res = await request(app)
        .put(`/api/contents/${contentId}`)
        .send({ title: '更新标题' })
        .expect(200)

      expect(res.body.data.updated_at).to.not.equal(originalUpdatedAt)
    })
  })

  describe('DELETE /api/contents/:id', () => {
    it('应该软删除内容', async () => {
      const createRes = await request(app)
        .post('/api/contents')
        .send({
          title: '待删除内容',
          content: '内容',
          type: '随笔'
        })

      const contentId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/contents/${contentId}`)
        .expect(200)

      expect(res.body.success).to.be.true

      // 验证内容已被软删除
      const getRes = await request(app)
        .get(`/api/contents/${contentId}`)
        .expect(404)
    })
  })

  describe('POST /api/contents/quick-save', () => {
    it('应该快速保存 URL 内容', async () => {
      const res = await request(app)
        .post('/api/contents/quick-save')
        .send({
          url: 'https://example.com/article',
          source: 'mobile'
        })
        .expect(201)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('url')
    })
  })

  describe('POST /api/contents/batch', () => {
    it('应该批量保存内容', async () => {
      const contents = [
        { title: '批量内容1', content: '内容1', type: '随笔' },
        { title: '批量内容2', content: '内容2', type: '文章' }
      ]

      const res = await request(app)
        .post('/api/contents/batch')
        .send({ contents })
        .expect(201)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('created')
      expect(res.body.data.created).to.be.at.least(2)
    })
  })
})
