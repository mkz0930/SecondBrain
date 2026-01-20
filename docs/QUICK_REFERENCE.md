# 自动化测试系统 - 快速参考卡

## 🚀 快速命令

```bash
# 测试
npm test                    # 运行所有测试
npm run test:watch          # 监听模式
npm run test:coverage       # 覆盖率报告
npm run test:api            # API 测试
npm run test:services       # 服务层测试

# 代码检查
npm run lint                # ESLint 检查

# 文档更新
npm run update-requirements # 更新需求文档

# 一键运行（Windows）
.\scripts\run-all-tests.bat

# 一键运行（Linux/Mac）
./scripts/run-all-tests.sh

# 验证配置（Windows）
.\scripts\verify-setup.bat

# 验证配置（Linux/Mac）
./scripts/verify-setup.sh
```

## 📝 提交消息格式

```bash
feat(module): 新功能
fix(module): Bug 修复
docs(module): 文档更新
refactor(module): 重构
test(module): 测试
chore(module): 构建/工具
```

## 🔧 Git Hooks

**Pre-commit**: ESLint + 快速测试 + TODO 检查
**Pre-push**: 完整测试 + 覆盖率 + 构建验证

跳过（不推荐）:
```bash
git commit --no-verify
git push --no-verify
```

## 📖 文档链接

- [完整指南](TESTING.md)
- [快速开始](docs/testing-quickstart.md)
- [速查表](docs/testing-cheatsheet.md)
- [自动化指南](docs/automation-guide.md)

## 🎯 覆盖率目标

- 总体: ≥ 80%
- 语句: ≥ 80%
- 分支: ≥ 75%
- 函数: ≥ 80%
- 行: ≥ 80%

---

**打印此卡片并放在桌面上！**
