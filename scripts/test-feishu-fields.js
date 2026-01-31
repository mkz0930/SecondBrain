import { query, queryOne } from './server/models/database.js'
import { FeishuAdapter } from './server/services/feishu-adapter.js'
import logger from './server/utils/logger.js'

async function testFeishuFields() {
  try {
    // 获取飞书配置
    const config = await queryOne(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [2]
    )

    if (!config) {
      console.log('未找到飞书配置')
      return
    }

    console.log('飞书配置:', {
      app_id: config.app_id,
      table_id: config.table_id
    })

    // 创建适配器
    const adapter = new FeishuAdapter({
      app_id: config.app_id,
      app_secret: config.app_secret,
      access_token: config.access_token,
      token_expires_at: config.token_expires_at,
      logger
    })

    // 获取字段列表
    const [appToken, tableId] = config.table_id.split('_')
    console.log('\n正在获取字段列表...')
    console.log('App Token:', appToken)
    console.log('Table ID:', tableId)

    const fields = await adapter.getFields(appToken, tableId)

    console.log('\n飞书表格字段列表:')
    console.log('总共', fields.length, '个字段\n')

    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.field_name} (类型: ${field.type})`)
    })

    // 获取一条记录看看实际数据
    console.log('\n正在获取记录示例...')
    const response = await adapter.searchRecords(appToken, tableId, { pageSize: 5 })

    console.log('\n记录示例:')
    response.items.forEach((record, index) => {
      console.log(`\n记录 ${index + 1} (${record.record_id}):`)
      Object.keys(record.fields).forEach(key => {
        const value = record.fields[key]
        const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100)
        console.log(`  ${key}: ${valueStr}`)
      })
    })

  } catch (error) {
    console.error('错误:', error.message)
    console.error(error.stack)
  }

  process.exit(0)
}

testFeishuFields()
