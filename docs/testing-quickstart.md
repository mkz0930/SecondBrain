# 快速开始 - 自动化测试

本指南帮助你快速设置和运行自动化测试系统。

## 快速安装

### 方式一：自动安装（推荐）

**Windows**:
```bash
.\scripts\setup-testing.bat
```

**Linux/Mac**:
```bash
chmod +x scripts/setup-testing.sh
./scripts/setup-testing.sh
```

### 方式二：手动安装

```bash
# 1. 安装测试依赖
npm install

# 2. 设置 Git Hooks 权限（Linux/Mac）
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

## 运行测试

### 基础命令

```bash
# 运行所有测试
npm test

# 运行特定测试
npm run test:api          # API 测试
npm run test:services     # 服务层测试

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 代码检查

```bash
# 运行 ESLint
npm run lint
```

## 工作流程

### 1. 开发新功能

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 编写代码和测试
# ...

# 3. 运行测试确保通过
npm test

# 4. 提交代码（自动触发 pre-commit hook）
git commit -m "feat(module): 添加新功能"

# 5. 推送代码（自动触发 pre-push hook）
git push origin feature/new-feature
```

### 2. 修复 Bug

```bash
# 1. 创建修复分支
git checkout -b fix/bug-description

# 2. 编写测试用例重现 Bug
# test/api/xxx.test.js

# 3. 修复 Bug
# ...

# 4. 确保测试通过
npm test

# 5. 提交
git commit -m "fix(module): 修复 XXX 问题"
```

### 3. 更新需求文档

```bash
# 手动更新需求文档
npm run update-requirements

# 或者推送到 main 分支后自动更新
git push origin main
```

## 测试示例

### API 测试示例

```javascript
// test/api/example.test.js
import { expect } from 'chai'
import request from 'supertest'

describe('示例 API 测试', () => {
  it('应该返回成功响应', async () => {
    const res = await request(app)
      .get('/api/example')
      .expect(200)

    expect(res.body).to.have.property('success', true)
    expect(res.body.data).to.be.an('array')
  })
})
```

### 服务测试示例

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
})
```

## Git Hooks 说明

### Pre-commit Hook

**触发时机**: `git commit` 前

**检查项**:
- ✅ ESLint 代码规范
- ✅ 快速测试（API 测试）
- ⚠️ TODO/FIXME 警告

**跳过方式**（不推荐）:
```bash
git commit --no-verify -m "message"
```

### Pre-push Hook

**触发时机**: `git push` 前

**检查项**:
- ✅ 完整测试套件
- ✅ 构建验证
- 📊 测试覆盖率（仅警告）

**跳过方式**（不推荐）:
```bash
git push --no-verify
```

## CI/CD 流程

### 自动触发

当你推送代码到 GitHub 时，会自动触发 CI/CD 流程：

1. **测试** - 在多个 Node 版本上运行测试
2. **构建** - 构建前端代码
3. **更新文档** - 自动更新需求文档（仅 main 分支）
4. **部署** - 部署到服务器（仅 main 分支）

### 查看状态

访问 GitHub 仓库的 Actions 页面查看工作流状态。

## 常见问题

### Q: 测试失败怎么办？

**A**:
1. 查看测试输出，定位失败的测试用例
2. 运行 `npm run test:watch` 进入监听模式调试
3. 检查测试环境配置 `.env.test`

### Q: Git Hooks 不执行？

**A**:
```bash
# Linux/Mac: 添加执行权限
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Windows: 确保 .bat 文件存在
# Git 会自动执行 .bat 版本
```

### Q: 如何跳过某些测试？

**A**:
```javascript
// 跳过单个测试
it.skip('暂时跳过的测试', () => {
  // ...
})

// 跳过整个测试套件
describe.skip('暂时跳过的测试套件', () => {
  // ...
})
```

### Q: 如何只运行特定测试？

**A**:
```javascript
// 只运行这个测试
it.only('只运行这个测试', () => {
  // ...
})

// 只运行这个测试套件
describe.only('只运行这个测试套件', () => {
  // ...
})
```

### Q: 测试覆盖率在哪里查看？

**A**:
```bash
# 生成覆盖率报告
npm run test:coverage

# 查看报告
# 终端会显示摘要
# 详细报告在 coverage/lcov-report/index.html
```

## 下一步

- 📖 阅读完整文档: [docs/automation-guide.md](docs/automation-guide.md)
- 🧪 查看测试用例: [test/](test/)
- 📝 查看需求文档: [docs/requirements.md](docs/requirements.md)
- 📊 查看测试报告: [docs/test-report.md](docs/test-report.md)

## 获取帮助

如果遇到问题：
1. 查看 [docs/automation-guide.md](docs/automation-guide.md) 完整文档
2. 查看测试输出日志
3. 检查 GitHub Actions 工作流日志

---

**最后更新**: 2026-01-20
