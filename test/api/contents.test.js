import { expect } from 'chai'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import contentsRouter from '../../server/routes/contents.js'

describe('Contents API 测试', () => {
  let app

  beforeAll(() => {
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

      expect(res.body).to.have.property('data')
      expect(res.body.data).to.be.an('array')
    })

    it('应该支持分页参数', async () => {
      const res = await request(app)
        .get('/api/contents?page=1&limit=10')
        .expect(200)

      expect(res.body.data).to.be.an('array')
      expect(res.body.data).to.have.length.at.most(10)
    })

    it('应该支持类型筛选', async () => {
      const res = await request(app)
        .get('/api/contents?type=' + encodeURIComponent('文章'))
        .expect(200)

      expect(res.body.data).to.be.an('array')
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('type', '文章')
      }
    })

    it('应该支持搜索功能', async () => {
      const res = await request(app)
        .get('/api/contents?search=' + encodeURIComponent('测试'))
        .expect(200)

      expect(res.body.data).to.be.an('array')
    })
  })

  describe('POST /api/contents', () => {
    it('应该创建新内容', async () => {
      const newContent = {
        title: '测试内容',
        content: '这是一个测试内容',
        type: '随笔',
        url: 'https://example.com'
      }

      const res = await request(app)
        .post('/api/contents')
        .send(newContent)

      // API 可能返回 201 或 200
      expect([200, 201]).to.include(res.status)
      expect(res.body).to.have.property('id')
    })

    it('应该验证必填字段', async () => {
      const invalidContent = {}

      const res = await request(app)
        .post('/api/contents')
        .send(invalidContent)
        .expect(400)

      expect(res.body).to.have.property('error')
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

      if (createRes.body.id) {
        const contentId = createRes.body.id

        const res = await request(app)
          .get(`/api/contents/${contentId}`)
          .expect(200)

        expect(res.body).to.have.property('id', contentId)
      }
    })

    it('应该返回 404 当内容不存在', async () => {
      const res = await request(app)
        .get('/api/contents/99999')
        .expect(404)

      expect(res.body).to.have.property('error')
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

      if (createRes.body.id) {
        const contentId = createRes.body.id

        const updateData = {
          title: '更新后的标题',
          content: '更新后的内容',
          rating: 5
        }

        const res = await request(app)
          .put(`/api/contents/${contentId}`)
          .send(updateData)
          .expect(200)

        expect(res.body).to.have.property('message')
      }
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

      if (createRes.body.id) {
        const contentId = createRes.body.id

        const res = await request(app)
          .delete(`/api/contents/${contentId}`)
          .expect(200)

        expect(res.body).to.have.property('message')

        // 验证内容已被软删除
        await request(app)
          .get(`/api/contents/${contentId}`)
          .expect(404)
      }
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

      // 可能返回 201 或 200
      expect([200, 201]).to.include(res.status)
      expect(res.body).to.have.property('id')
    })
  })
})
