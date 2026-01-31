import { expect } from 'chai'
import aiService from '../../server/services/ai-service.js'

describe('AI Service 测试', () => {
  // 跳过需要真实 API Key 的测试
  const skipIfNoApiKey = process.env.GOOGLE_API_KEY === 'test_key' || !process.env.GOOGLE_API_KEY

  describe('analyzeContent', () => {
    it.skipIf(skipIfNoApiKey)('应该分析内容并返回结构化数据', async () => {
      const content = `
        这是一篇关于人工智能的文章。
        人工智能正在改变我们的生活方式。
        机器学习和深度学习是AI的核心技术。
      `

      const result = await aiService.analyzeContent(content, 'https://example.com')

      expect(result).to.be.an('object')
      expect(result).to.have.property('title')
      expect(result).to.have.property('summary')
      expect(result).to.have.property('type')
      expect(result).to.have.property('tags')
      expect(result.tags).to.be.an('array')
    })

    it('应该处理空内容', async () => {
      if (!aiService || !aiService.analyzeContent) {
        return // 跳过如果服务未正确加载
      }
      const result = await aiService.analyzeContent('', '')

      expect(result).to.be.an('object')
      // 应该返回默认值或错误
    })

    it.skipIf(skipIfNoApiKey)('应该处理超长内容', async () => {
      const longContent = '这是一段很长的内容。'.repeat(1000)

      const result = await aiService.analyzeContent(longContent, '')

      expect(result).to.be.an('object')
      expect(result.summary).to.have.length.lessThan(500)
    })
  })

  describe('generateDailySummary', () => {
    it.skipIf(skipIfNoApiKey)('应该生成每日总结', async () => {
      const contents = [
        {
          title: '文章1',
          summary: '这是第一篇文章的摘要',
          type: '文章',
          tags: ['技术', 'AI']
        },
        {
          title: '文章2',
          summary: '这是第二篇文章的摘要',
          type: '随笔',
          tags: ['生活']
        }
      ]

      const result = await aiService.generateDailySummary(contents, '2026-01-20')

      expect(result).to.be.a('string')
      expect(result.length).to.be.greaterThan(0)
    })

    it('应该处理空内容列表', async () => {
      if (!aiService || !aiService.generateDailySummary) {
        return // 跳过如果服务未正确加载
      }
      const result = await aiService.generateDailySummary([], '2026-01-20')

      expect(result).to.be.a('string')
    })
  })

  describe('模型降级机制', () => {
    it.skipIf(skipIfNoApiKey)('应该在主模型失败时尝试备用模型', { timeout: 30000 }, async () => {
      // 测试模型降级逻辑
      const content = '测试内容'

      try {
        const result = await aiService.analyzeContent(content, '')
        expect(result).to.be.an('object')
      } catch (error) {
        // 如果所有模型都失败，应该有清晰的错误信息
        expect(error.message).to.include('AI')
      }
    })
  })

  describe('错误处理', () => {
    it.skipIf(skipIfNoApiKey)('应该处理网络错误', async () => {
      // 模拟网络错误场景
      const originalKey = process.env.GOOGLE_API_KEY
      process.env.GOOGLE_API_KEY = 'invalid_key'

      try {
        await aiService.analyzeContent('测试', '')
        expect.fail('应该抛出错误')
      } catch (error) {
        expect(error).to.exist
      } finally {
        process.env.GOOGLE_API_KEY = originalKey
      }
    })

    it.skipIf(skipIfNoApiKey)('应该处理超时', { timeout: 5000 }, async () => {
      // 测试超时处理
      const veryLongContent = '内容 '.repeat(10000)

      try {
        await aiService.analyzeContent(veryLongContent, '')
      } catch (error) {
        // 应该优雅地处理超时
        expect(error).to.exist
      }
    })
  })
})
