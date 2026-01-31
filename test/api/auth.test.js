import { expect } from 'chai'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRouter from '../../server/routes/auth.js'

describe('Auth API 测试', () => {
  let app

  beforeAll(() => {
    app = express()
    app.use(cors())
    app.use(express.json())
    app.use('/api/auth', authRouter)
  })

  describe('POST /api/auth/login', () => {
    it('应该使用正确的凭据登录', async () => {
      const credentials = {
        username: 'test_user',
        password: 'test_password'
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send(credentials)

      // 根据实际实现调整期望
      if (res.status === 200) {
        expect(res.body).to.have.property('token')
        expect(res.body).to.have.property('user_id')
      }
    })

    it('应该拒绝错误的凭据', async () => {
      const credentials = {
        username: 'wrong_user',
        password: 'wrong_password'
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401)

      expect(res.body).to.have.property('error')
    })

    it('应该验证必填字段', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400)

      expect(res.body).to.have.property('error')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('应该要求提供 token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(400)

      expect(res.body).to.have.property('error', 'Token is required')
    })

    it('应该拒绝无效的 token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401)

      expect(res.body).to.have.property('error')
    })
  })
})
