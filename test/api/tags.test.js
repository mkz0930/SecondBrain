import { expect } from 'chai'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import tagsRouter from '../../server/routes/tags.js'

describe('Tags API 测试', () => {
  let app

  beforeAll(() => {
    app = express()
    app.use(cors())
    app.use(express.json())

    // 模拟认证
    app.use((req, res, next) => {
      req.user = { id: 1, username: 'test_user' }
      next()
    })

    app.use('/api/tags', tagsRouter)
  })

  describe('GET /api/tags', () => {
    it('应该返回标签列表', async () => {
      const res = await request(app)
        .get('/api/tags')
        .expect(200)

      expect(res.body).to.have.property('data')
      expect(res.body.data).to.be.an('array')
    })

    it('应该包含标签使用统计', async () => {
      const res = await request(app)
        .get('/api/tags')
        .expect(200)

      expect(res.body.data).to.be.an('array')
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('count')
      }
    })
  })

  describe('POST /api/tags', () => {
    it('应该创建新标签', async () => {
      const newTag = {
        name: `测试标签_${Date.now()}`,
        color: '#FF5733'
      }

      const res = await request(app)
        .post('/api/tags')
        .send(newTag)
        .expect(201)

      expect(res.body).to.have.property('id')
      expect(res.body).to.have.property('message')
    })

    it('应该防止重复标签名', async () => {
      const tag = { name: `重复标签_${Date.now()}`, color: '#000000' }

      // 第一次创建
      await request(app)
        .post('/api/tags')
        .send(tag)
        .expect(201)

      // 第二次创建应该失败 (409 Conflict)
      const res = await request(app)
        .post('/api/tags')
        .send(tag)
        .expect(409)

      expect(res.body).to.have.property('error')
    })

    it('应该验证必填字段', async () => {
      const res = await request(app)
        .post('/api/tags')
        .send({})
        .expect(400)

      expect(res.body).to.have.property('error')
    })
  })
})
