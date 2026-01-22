/**
 * 检查飞书表格字段类型
 * 用于诊断字段类型转换问题
 */

import { query } from '../server/models/database.js'
import { FeishuAdapter } from '../server/services/feishu-adapter.js'
import logger from '../server/utils/logger.js'

async function checkFeishuFields() {
  try {
    // 获取飞书配置
    const config = await query(
      'SELECT * FROM feishu_sync_config WHERE user_id = ? AND enabled = 1',
      [2]
    )

    if (!config || config.length === 0) {
      console.log('未找到启用的飞书同步配置')
      return
    }

    const syncConfig = config[0]
    const [appToken, tableId] = syncConfig.table_id.split('_')

    // 创建适配器
    const adapter = new FeishuAdapter({
      app_id: syncConfig.app_id,
      app_secret: syncConfig.app_secret,
      access_token: syncConfig.access_token,
      token_expires_at: syncConfig.token_expires_at,
      logger
    })

    // 刷新token
    await adapter.refreshAccessToken()

    // 获取字段列表
    console.log('\n=== 飞书表格字段信息 ===\n')
    const fields = await adapter.getFields(appToken, tableId)

    // 字段类型映射
    const typeNames = {
      1: '文本 (Text)',
      2: '数字 (Number)',
      3: '单选 (Single Select)',
      4: '多选 (Multi Select)',
      5: '日期 (Date)',
      7: '复选框 (Checkbox)',
      11: '人员 (Person)',
      13: '电话 (Phone)',
      15: '超链接 (URL)',
      17: '附件 (Attachment)',
      18: '单向关联 (Single Link)',
      19: '查找引用 (Lookup)',
      20: '公式 (Formula)',
      21: '双向关联 (Double Link)',
      22: '地理位置 (Location)',
      23: '群组 (Group)',
      1001: '创建时间 (Created Time)',
      1002: '修改时间 (Modified Time)',
      1003: '创建人 (Created By)',
      1004: '修改人 (Modified By)',
      1005: '自动编号 (Auto Number)'
    }

    fields.forEach(field => {
      console.log(`字段名: ${field.field_name}`)
      console.log(`  类型: ${field.type} - ${typeNames[field.type] || '未知类型'}`)
      console.log(`  字段ID: ${field.field_id}`)

      // 如果是单选或多选字段，显示选项
      if (field.type === 3 || field.type === 4) {
        if (field.property && field.property.options) {
          console.log(`  选项:`)
          field.property.options.forEach(opt => {
            console.log(`    - ${opt.name} (ID: ${opt.id})`)
          })
        }
      }

      console.log('')
    })

    console.log('\n=== 关键字段分析 ===\n')

    // 检查"分类"字段
    const categoryField = fields.find(f => f.field_name === '分类')
    if (categoryField) {
      console.log('✓ 找到"分类"字段')
      console.log(`  类型: ${categoryField.type} - ${typeNames[categoryField.type]}`)
      if (categoryField.type === 3 || categoryField.type === 4) {
        console.log('  ⚠️  这是一个选择字段，需要特殊处理！')
        if (categoryField.property && categoryField.property.options) {
          console.log('  可用选项:')
          categoryField.property.options.forEach(opt => {
            console.log(`    - ${opt.name}`)
          })
        }
      }
    } else {
      console.log('✗ 未找到"分类"字段')
    }

    console.log('')

    // 检查"标签"字段
    const tagsField = fields.find(f => f.field_name === '标签')
    if (tagsField) {
      console.log('✓ 找到"标签"字段')
      console.log(`  类型: ${tagsField.type} - ${typeNames[tagsField.type]}`)
      if (tagsField.type === 3 || tagsField.type === 4) {
        console.log('  ⚠️  这是一个选择字段，需要特殊处理！')
      }
    } else {
      console.log('✗ 未找到"标签"字段')
    }

    console.log('\n=== 建议 ===\n')
    console.log('如果"分类"或"标签"是单选/多选字段，需要：')
    console.log('1. 在 feishu-adapter.js 中添加类型 3 和 4 的处理逻辑')
    console.log('2. 将字符串值转换为飞书期望的格式')
    console.log('3. 单选字段格式: "选项名称"')
    console.log('4. 多选字段格式: ["选项1", "选项2"]')
    console.log('')

  } catch (error) {
    console.error('检查失败:', error.message)
    console.error(error.stack)
  }
}

checkFeishuFields()
