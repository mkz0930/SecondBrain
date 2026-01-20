import { expect } from 'chai'
import request from 'supertest'
import express from 'express'
import cors from 'express'
import tagsRouter from '../../server/routes/tags.js'

describe('Tags API 测试', () => {
  let app

  before(() => {
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

      expect(res.body).to.have.property('success', true)
      expect(res.body.data).to.be.an('array')
    })

    it('应该包含标签使用统计', async () => {
      const res = await request(app)
        .get('/api/tags?includeStats=true')
        .expect(200)

      expect(res.body.success).to.be.true
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('count')
      }
    })
  })

  describe('POST /api/tags', () => {
    it('应该创建新标签', async () => {
      const newTag = {
        name: '测试标签',
        color: '#FF5733'
      }

      const res = await request(app)
        .post('/api/tags')
        .send(newTag)
        .expect(201)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('name', newTag.name)
      expect(res.body.data).to.have.property('color', newTag.color)
    })

    it('应该防止重复标签名', async () => {
      const tag = { name: '重复标签', color: '#000000' }

      // 第一次创建
      await request(app)
        .post('/api/tags')
        .send(tag)
        .expect(201)

      // 第二次创建应该失败
      const res = await request(app)
        .post('/api/tags')
        .send(tag)
        .expect(400)

      expect(res.body.success).to.be.false
    })
  })

  describe('PUT /api/tags/:id', () => {
    it('应该更新标签', async () => {
      const createRes = await request(app)
        .post('/api/tags')
        .send({ name: '原始标签', color: '#000000' })

      const tagId = createRes.body.data.id

      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .send({ name: '更新标签', color: '#FFFFFF' })
        .expect(200)

      expect(res.body.success).to.be.true
      expect(res.body.data).to.have.property('name', '更新标签')
    })
  })

  describe('DELETE /api/tags/:id', () => {
    it('应该删除标签', async () => {
      const createRes = await request(app)
        .post('/api/tags')
        .send({ name: '待删除标签', color: '#000000' })

      const tagId = createRes.body.data.id

      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .expect(200)

      expect(res.body.success).to.be.true
    })
  })
})
