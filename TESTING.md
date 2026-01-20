# 自动化测试系统使用指南

## 系统概述

本项目已配置完整的自动化测试和需求文档更新系统，包括：

✅ **测试框架**: Mocha + Chai + Supertest
✅ **代码检查**: ESLint
✅ **覆盖率**: c8
✅ **Git Hooks**: pre-commit + pre-push
✅ **CI/CD**: GitHub Actions
✅ **文档自动更新**: 基于 Git 提交历史

## 快速开始

### 1. 安装依赖

```bash
# 方式一：使用 npm（推荐）
npm install

# 方式二：使用自动安装脚本
# Windows
.\scripts\setup-testing.bat

# Linux/Mac
chmod +x scripts/setup-testing.sh
./scripts/setup-testing.sh
```

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:api          # API 测试
npm run test:services     # 服务层测试

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 3. 代码检查

```bash
# 运行 ESLint
npm run lint
```

### 4. 更新需求文档

```bash
# 手动更新需求文档和测试报告
npm run update-requirements
```

### 5. 一键运行所有检查

```bash
# Windows
.\scripts\run-all-tests.bat

# Linux/Mac
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh
```

这将依次执行：
1. ✅ ESLint 代码检查
2. ✅ 完整测试套件
3. ✅ 覆盖率报告生成
4. ✅ 需求文档更新

## 工作流程

### 开发新功能

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 编写代码和测试
# 在 test/ 目录下添加测试用例

# 3. 运行测试确保通过
npm test

# 4. 提交代码（自动触发 pre-commit hook）
git add .
git commit -m "feat(module): 添加新功能"
# 自动运行: ESLint + 快速测试

# 5. 推送代码（自动触发 pre-push hook）
git push origin feature/new-feature
# 自动运行: 完整测试 + 构建验证
```

### 修复 Bug

```bash
# 1. 创建修复分支
git checkout -b fix/bug-description

# 2. 编写测试用例重现 Bug
# test/api/xxx.test.js

# 3. 修复 Bug 并确保测试通过
npm test

# 4. 提交
git commit -m "fix(module): 修复 XXX 问题"
```

### 合并到主分支

```bash
# 推送到 main 分支后，GitHub Actions 会自动：
# 1. 运行完整测试（多个 Node 版本）
# 2. 构建前端代码
# 3. 更新需求文档
# 4. 部署到服务器（如已配置）
```

## Git Hooks 说明

### Pre-commit Hook

**触发时机**: 每次 `git commit` 前

**检查内容**:
- ✅ ESLint 代码规范检查
- ✅ 快速测试（API 测试）
- ⚠️ TODO/FIXME 警告

**如何跳过**（不推荐）:
```bash
git commit --no-verify -m "message"
```

### Pre-push Hook

**触发时机**: 每次 `git push` 前

**检查内容**:
- ✅ 完整测试套件
- ✅ 构建验证
- 📊 测试覆盖率（仅警告）

**如何跳过**（不推荐）:
```bash
git push --no-verify
```

## 提交消息规范

为了让需求文档自动更新正常工作，请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例

```bash
# 新功能
git commit -m "feat(contents): 添加批量导入功能"

# Bug 修复
git commit -m "fix(sync): 修复飞书同步冲突问题"

# 文档更新
git commit -m "docs(api): 更新 API 文档"

# 重构
git commit -m "refactor(services): 优化 AI 服务结构"

# 测试
git commit -m "test(api): 添加内容 API 测试用例"

# 构建/工具
git commit -m "chore(deps): 升级依赖版本"
```

## 测试用例编写

### API 测试示例

```javascript
// test/api/example.test.js
import { expect } from 'chai'
import request from 'supertest'
import express from 'express'

describe('示例 API 测试', () => {
  let app

  before(() => {
    // 设置测试应用
    app = express()
    // ... 配置
  })

  it('应该返回成功响应', async () => {
    const res = await request(app)
      .get('/api/example')
      .expect(200)

    expect(res.body).to.have.property('success', true)
    expect(res.body.data).to.be.an('array')
  })

  it('应该验证必填字段', async () => {
    const res = await request(app)
      .post('/api/example')
      .send({})
      .expect(400)

    expect(res.body.success).to.be.false
  })
})
```

### 服务层测试示例

```javascript
// test/services/example.test.js
import { expect } from 'chai'
import exampleService from '../../server/services/example-service.js'

describe('示例服务测试', () => {
  it('应该处理数据', async () => {
    const result = await exampleService.process('input')

    expect(result).to.be.a('string')
    expect(result).to.include('processed')
  })

  it('应该处理错误', async () => {
    try {
      await exampleService.process(null)
      expect.fail('应该抛出错误')
    } catch (error) {
      expect(error).to.exist
    }
  })
})
```

### 跳过测试

```javascript
// 跳过单个测试
it.skip('暂时跳过的测试', () => {
  // ...
})

// 只运行这个测试
it.only('只运行这个测试', () => {
  // ...
})

// 跳过整个测试套件
describe.skip('暂时跳过的测试套件', () => {
  // ...
})
```

## CI/CD 流程

### GitHub Actions 工作流

当你推送代码到 GitHub 时，会自动触发以下流程：

#### 1. 测试任务 (test)

- **触发条件**: Push 或 PR 到 main/develop 分支
- **运行环境**: Ubuntu Latest
- **Node 版本**: 18.x, 20.x（矩阵测试）
- **步骤**:
  1. 检出代码
  2. 设置 Node.js 环境
  3. 安装依赖
  4. 运行 ESLint
  5. 运行测试
  6. 生成覆盖率报告
  7. 上传到 Codecov

#### 2. 构建任务 (build)

- **依赖**: 测试任务通过
- **步骤**:
  1. 构建前端代码
  2. 上传构建产物

#### 3. 更新需求文档 (update-requirements)

- **触发条件**: Push 到 main 分支
- **依赖**: 测试任务通过
- **步骤**:
  1. 运行需求文档更新脚本
  2. 自动提交文档变更
  3. 推送到仓库

#### 4. 部署任务 (deploy)

- **触发条件**: Push 到 main 分支
- **依赖**: 构建任务完成
- **步骤**:
  1. 下载构建产物
  2. 部署到服务器

### 查看工作流状态

1. 访问 GitHub 仓库
2. 点击 "Actions" 标签
3. 查看最新工作流运行状态
4. 点击查看详细日志

## 测试覆盖率

### 生成覆盖率报告

```bash
npm run test:coverage
```

### 查看报告

- **终端**: 显示覆盖率摘要
- **HTML 报告**: `coverage/lcov-report/index.html`
- **在线报告**: Codecov（需配置）

### 覆盖率目标

- **总体覆盖率**: ≥ 80%
- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 80%
- **行覆盖率**: ≥ 80%

## 常见问题

### Q: 测试失败怎么办？

**A**:
1. 查看测试输出，定位失败的测试用例
2. 运行 `npm run test:watch` 进入监听模式调试
3. 检查测试环境配置 `.env.test`
4. 确保数据库文件存在 `data/test.db`

### Q: Git Hooks 不执行？

**A**:
```bash
# Linux/Mac: 添加执行权限
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Windows: 确保 .bat 文件存在
dir .git\hooks\*.bat
```

### Q: 如何跳过某些测试？

**A**:
```javascript
// 跳过单个测试
it.skip('暂时跳过的测试', () => {})

// 跳过整个测试套件
describe.skip('暂时跳过的测试套件', () => {})
```

### Q: 如何只运行特定测试？

**A**:
```javascript
// 只运行这个测试
it.only('只运行这个测试', () => {})

// 只运行这个测试套件
describe.only('只运行这个测试套件', () => {})
```

### Q: CI/CD 失败怎么办？

**A**:
1. 查看 GitHub Actions 日志
2. 本地运行相同命令验证
3. 检查环境变量配置
4. 确保所有依赖都在 `package.json` 中

### Q: 需求文档没有自动更新？

**A**:
1. 检查提交消息是否符合规范
2. 确保推送到 `main` 分支
3. 查看 GitHub Actions 日志
4. 手动运行 `npm run update-requirements`

## 文件结构

```
SecondBrain/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions 工作流
├── .git/
│   └── hooks/
│       ├── pre-commit          # 提交前检查（Linux/Mac）
│       ├── pre-commit.bat      # 提交前检查（Windows）
│       ├── pre-push            # 推送前检查（Linux/Mac）
│       └── pre-push.bat        # 推送前检查（Windows）
├── test/
│   ├── setup.js                # 测试环境初始化
│   ├── api/                    # API 测试
│   │   ├── contents.test.js
│   │   ├── tags.test.js
│   │   └── auth.test.js
│   ├── services/               # 服务层测试
│   │   ├── ai-service.test.js
│   │   └── sync-service.test.js
│   └── frontend/               # 前端测试
│       └── components.test.js
├── scripts/
│   ├── update-requirements.js  # 需求文档更新脚本
│   ├── setup-testing.sh        # 安装脚本（Linux/Mac）
│   ├── setup-testing.bat       # 安装脚本（Windows）
│   ├── run-all-tests.sh        # 测试脚本（Linux/Mac）
│   └── run-all-tests.bat       # 测试脚本（Windows）
├── docs/
│   ├── automation-guide.md     # 完整指南
│   ├── automation-summary.md   # 完成总结
│   ├── testing-quickstart.md   # 快速开始
│   └── test-report.md          # 测试报告
├── .mocharc.json               # Mocha 配置
├── .eslintrc.cjs               # ESLint 配置
├── .env.test                   # 测试环境变量
└── package.json                # 测试脚本和依赖
```

## 相关文档

- 📖 [完整自动化指南](docs/automation-guide.md) - 详细的使用说明
- 🚀 [快速开始](docs/testing-quickstart.md) - 5分钟上手
- 📊 [测试报告](docs/test-report.md) - 测试结果
- 📝 [完成总结](docs/automation-summary.md) - 系统概述

## 最佳实践

### 1. 测试编写

- ✅ 遵循 AAA 模式（Arrange, Act, Assert）
- ✅ 使用描述性的测试名称
- ✅ 每个测试独立运行
- ✅ Mock 外部依赖
- ✅ 测试边界条件和错误情况

### 2. 提交规范

- ✅ 使用 Conventional Commits 格式
- ✅ 每次提交只包含一个逻辑变更
- ✅ 提交前运行测试
- ✅ 编写清晰的提交消息

### 3. 代码质量

- ✅ 保持测试覆盖率 ≥ 80%
- ✅ 修复所有 ESLint 警告
- ✅ 为新功能编写测试
- ✅ 定期更新依赖

### 4. CI/CD

- ✅ 确保所有测试通过后再合并
- ✅ 定期查看 CI/CD 日志
- ✅ 保持构建绿色
- ✅ 及时修复失败的测试

## 获取帮助

如果遇到问题：

1. 📖 查看 [完整文档](docs/automation-guide.md)
2. 🔍 查看测试输出日志
3. 🔧 检查 GitHub Actions 工作流日志
4. 💬 提交 Issue 到 GitHub

---

**维护者**: Second Brain 开发团队
**最后更新**: 2026-01-20
**版本**: 1.0.0
**状态**: ✅ 生产就绪
