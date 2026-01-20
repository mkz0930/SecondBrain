import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载测试环境变量
dotenv.config({ path: join(__dirname, '../.env.test') })

// 设置测试环境
process.env.NODE_ENV = 'test'
process.env.PORT = process.env.TEST_PORT || 3001
process.env.DB_PATH = join(__dirname, '../data/test.db')

// 全局测试配置
global.testConfig = {
  apiUrl: `http://localhost:${process.env.PORT}`,
  timeout: 10000
}

console.log('测试环境已初始化')
console.log(`API URL: ${global.testConfig.apiUrl}`)
console.log(`数据库: ${process.env.DB_PATH}`)
