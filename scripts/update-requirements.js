import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 需求文档自动更新脚本
 *
 * 功能：
 * 1. 分析最近的 git 提交
 * 2. 提取相关的功能变更
 * 3. 更新需求文档状态
 * 4. 生成测试报告
 */

class RequirementsUpdater {
  constructor() {
    this.requirementsPath = path.join(__dirname, '../docs/requirements.md')
    this.testReportPath = path.join(__dirname, '../docs/test-report.md')
  }

  /**
   * 获取最近的 git 提交
   */
  getRecentCommits(count = 10) {
    try {
      const commits = execSync(`git log -${count} --pretty=format:"%H|%s|%ad" --date=short`, {
        encoding: 'utf-8'
      })

      return commits.split('\n').map(line => {
        const [hash, message, date] = line.split('|')
        return { hash, message, date }
      })
    } catch (error) {
      console.error('获取 git 提交失败:', error.message)
      return []
    }
  }

  /**
   * 分析提交消息，提取功能关键词
   */
  analyzeCommits(commits) {
    const keywords = {
      feat: '新功能',
      fix: '修复',
      docs: '文档',
      style: '样式',
      refactor: '重构',
      test: '测试',
      chore: '构建/工具'
    }

    const changes = []

    commits.forEach(commit => {
      const match = commit.message.match(/^(feat|fix|docs|style|refactor|test|chore)(\(.+?\))?:\s*(.+)/)

      if (match) {
        const [, type, scope, description] = match
        changes.push({
          type: keywords[type] || type,
          scope: scope ? scope.replace(/[()]/g, '') : '',
          description,
          date: commit.date,
          hash: commit.hash.substring(0, 7)
        })
      }
    })

    return changes
  }

  /**
   * 读取现有需求文档
   */
  readRequirements() {
    try {
      if (fs.existsSync(this.requirementsPath)) {
        return fs.readFileSync(this.requirementsPath, 'utf-8')
      }
      return this.createDefaultRequirements()
    } catch (error) {
      console.error('读取需求文档失败:', error.message)
      return this.createDefaultRequirements()
    }
  }

  /**
   * 创建默认需求文档
   */
  createDefaultRequirements() {
    return `# 需求文档

## 项目概述
外挂大脑（Second Brain）- 智能知识管理系统

## 功能需求

### 已完成功能
- ✅ 内容管理（CRUD）
- ✅ AI 内容分析
- ✅ 飞书同步
- ✅ 标签管理
- ✅ 搜索功能

### 进行中功能

### 待开发功能

## 更新日志

`
  }

  /**
   * 更新需求文档
   */
  updateRequirements(changes) {
    let content = this.readRequirements()

    // 添加更新日志部分
    const updateLog = this.generateUpdateLog(changes)

    // 查找更新日志部分
    const logSectionIndex = content.indexOf('## 更新日志')

    if (logSectionIndex !== -1) {
      // 在更新日志部分后插入新内容
      const beforeLog = content.substring(0, logSectionIndex + '## 更新日志'.length)
      const afterLog = content.substring(logSectionIndex + '## 更新日志'.length)

      content = beforeLog + '\n\n' + updateLog + afterLog
    } else {
      // 如果没有更新日志部分，添加到末尾
      content += '\n## 更新日志\n\n' + updateLog
    }

    // 写入文件
    fs.writeFileSync(this.requirementsPath, content, 'utf-8')
    console.log('✅ 需求文档已更新:', this.requirementsPath)
  }

  /**
   * 生成更新日志
   */
  generateUpdateLog(changes) {
    if (changes.length === 0) {
      return ''
    }

    const today = new Date().toISOString().split('T')[0]
    let log = `### ${today}\n\n`

    // 按类型分组
    const grouped = {}
    changes.forEach(change => {
      if (!grouped[change.type]) {
        grouped[change.type] = []
      }
      grouped[change.type].push(change)
    })

    // 生成日志
    Object.keys(grouped).forEach(type => {
      log += `**${type}**:\n`
      grouped[type].forEach(change => {
        const scope = change.scope ? `[${change.scope}] ` : ''
        log += `- ${scope}${change.description} (${change.hash})\n`
      })
      log += '\n'
    })

    return log
  }

  /**
   * 运行测试并生成报告
   */
  async generateTestReport() {
    console.log('🧪 运行测试...')

    try {
      // 运行测试
      const testOutput = execSync('npm test', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })

      // 解析测试结果
      const report = this.parseTestOutput(testOutput)

      // 生成报告文档
      this.writeTestReport(report)

      console.log('✅ 测试报告已生成:', this.testReportPath)
    } catch (error) {
      console.error('⚠️  测试执行失败，生成失败报告')
      this.writeTestReport({
        success: false,
        error: error.message,
        output: error.stdout || error.message
      })
    }
  }

  /**
   * 解析测试输出
   */
  parseTestOutput(output) {
    const lines = output.split('\n')

    // 提取测试统计
    const passMatch = output.match(/(\d+) passing/)
    const failMatch = output.match(/(\d+) failing/)
    const pendingMatch = output.match(/(\d+) pending/)

    return {
      success: !failMatch,
      passing: passMatch ? parseInt(passMatch[1]) : 0,
      failing: failMatch ? parseInt(failMatch[1]) : 0,
      pending: pendingMatch ? parseInt(pendingMatch[1]) : 0,
      output: output
    }
  }

  /**
   * 写入测试报告
   */
  writeTestReport(report) {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toLocaleTimeString('zh-CN')

    let content = `# 测试报告

**生成时间**: ${date} ${time}

## 测试结果

`

    if (report.success) {
      content += `✅ **状态**: 通过

- ✅ 通过: ${report.passing}
- ❌ 失败: ${report.failing}
- ⏸️  待定: ${report.pending}

## 详细输出

\`\`\`
${report.output}
\`\`\`
`
    } else {
      content += `❌ **状态**: 失败

${report.error ? `**错误**: ${report.error}` : ''}

## 详细输出

\`\`\`
${report.output}
\`\`\`
`
    }

    content += `
## 测试覆盖率

运行 \`npm run test:coverage\` 查看详细覆盖率报告。

## 建议

${report.failing > 0 ? '- 修复失败的测试用例\n' : ''}
${report.pending > 0 ? '- 完成待定的测试用例\n' : ''}
- 保持测试覆盖率在 80% 以上
- 定期更新测试用例
`

    fs.writeFileSync(this.testReportPath, content, 'utf-8')
  }

  /**
   * 主执行函数
   */
  async run() {
    console.log('📝 开始更新需求文档...\n')

    // 1. 获取最近提交
    console.log('📋 分析最近的提交...')
    const commits = this.getRecentCommits(10)
    const changes = this.analyzeCommits(commits)

    if (changes.length > 0) {
      console.log(`找到 ${changes.length} 个变更`)

      // 2. 更新需求文档
      this.updateRequirements(changes)
    } else {
      console.log('没有发现新的变更')
    }

    // 3. 生成测试报告
    await this.generateTestReport()

    console.log('\n✅ 需求文档更新完成！')
  }
}

// 执行更新
const updater = new RequirementsUpdater()
updater.run().catch(error => {
  console.error('❌ 更新失败:', error)
  process.exit(1)
})
