# 自动化测试系统 - 快速参考

## 常用命令

### 测试相关
```bash
npm test                    # 运行所有测试
npm run test:watch          # 监听模式
npm run test:coverage       # 覆盖率报告
npm run test:api            # 仅 API 测试
npm run test:services       # 仅服务层测试
```

### 代码检查
```bash
npm run lint                # 运行 ESLint
```

### 文档更新
```bash
npm run update-requirements # 更新需求文档
```

### 一键运行
```bash
# Windows
.\scripts\run-all-tests.bat

# Linux/Mac
./scripts/run-all-tests.sh
```

### 验证配置
```bash
# Windows
.\scripts\verify-setup.bat

# Linux/Mac
./scripts/verify-setup.sh
```

## 提交消息格式

```bash
# 新功能
git commit -m "feat(module): 描述"

# Bug 修复
git commit -m "fix(module): 描述"

# 文档
git commit -m "docs(module): 描述"

# 重构
git commit -m "refactor(module): 描述"

# 测试
git commit -m "test(module): 描述"

# 构建/工具
git commit -m "chore(module): 描述"
```

## Git Hooks

### Pre-commit
- ✅ ESLint 检查
- ✅ 快速测试
- ⚠️ TODO 检查

### Pre-push
- ✅ 完整测试
- ✅ 构建验证
- 📊 覆盖率检查

### 跳过 Hooks（不推荐）
```bash
git commit --no-verify
git push --no-verify
```

## 测试编写

### 基本结构
```javascript
describe('测试套件', () => {
  before(() => {
    // 所有测试前执行一次
  })

  beforeEach(() => {
    // 每个测试前执行
  })

  it('应该做某事', () => {
    // 测试代码
    expect(result).to.equal(expected)
  })

  afterEach(() => {
    // 每个测试后执行
  })

  after(() => {
    // 所有测试后执行一次
  })
})
```

### 常用断言
```javascript
// 相等性
expect(value).to.equal(expected)
expect(value).to.deep.equal(expected)

// 类型
expect(value).to.be.a('string')
expect(value).to.be.an('array')

// 包含
expect(array).to.include(item)
expect(string).to.contain('substring')

// 属性
expect(obj).to.have.property('key')
expect(obj).to.have.property('key', value)

// 布尔值
expect(value).to.be.true
expect(value).to.be.false
expect(value).to.exist

// 数值
expect(value).to.be.above(5)
expect(value).to.be.below(10)
expect(value).to.be.within(5, 10)

// 长度
expect(array).to.have.length(3)
expect(string).to.have.length.above(5)
```

### 异步测试
```javascript
// Promise
it('应该处理异步操作', async () => {
  const result = await asyncFunction()
  expect(result).to.exist
})

// 错误处理
it('应该抛出错误', async () => {
  try {
    await functionThatThrows()
    expect.fail('应该抛出错误')
  } catch (error) {
    expect(error).to.exist
  }
})
```

### 跳过和专注
```javascript
// 跳过测试
it.skip('暂时跳过', () => {})
describe.skip('跳过整个套件', () => {})

// 只运行这个
it.only('只运行这个', () => {})
describe.only('只运行这个套件', () => {})
```

## 文件位置

### 配置文件
- `package.json` - 测试脚本和依赖
- `.mocharc.json` - Mocha 配置
- `.eslintrc.cjs` - ESLint 配置
- `.env.test` - 测试环境变量

### 测试文件
- `test/api/` - API 测试
- `test/services/` - 服务层测试
- `test/frontend/` - 前端测试
- `test/setup.js` - 测试初始化

### Git Hooks
- `.git/hooks/pre-commit` - 提交前检查
- `.git/hooks/pre-push` - 推送前检查

### CI/CD
- `.github/workflows/ci-cd.yml` - GitHub Actions

### 脚本
- `scripts/update-requirements.js` - 文档更新
- `scripts/setup-testing.*` - 安装脚本
- `scripts/run-all-tests.*` - 测试脚本
- `scripts/verify-setup.*` - 验证脚本

### 文档
- `TESTING.md` - 完整使用指南
- `docs/automation-guide.md` - 详细指南
- `docs/testing-quickstart.md` - 快速开始
- `docs/test-report.md` - 测试报告

## 故障排除

### 测试失败
```bash
# 查看详细输出
npm test

# 监听模式调试
npm run test:watch

# 检查环境
cat .env.test
```

### Hooks 不执行
```bash
# Linux/Mac
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Windows
# 确保 .bat 文件存在
```

### 依赖问题
```bash
# 重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用安装脚本
./scripts/setup-testing.sh
```

## 覆盖率目标

- 总体覆盖率: ≥ 80%
- 语句覆盖率: ≥ 80%
- 分支覆盖率: ≥ 75%
- 函数覆盖率: ≥ 80%
- 行覆盖率: ≥ 80%

## 相关链接

- [Mocha 文档](https://mochajs.org/)
- [Chai 断言库](https://www.chaijs.com/)
- [Supertest](https://github.com/visionmedia/supertest)
- [ESLint](https://eslint.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**快速帮助**: 查看 `TESTING.md` 获取完整使用指南
