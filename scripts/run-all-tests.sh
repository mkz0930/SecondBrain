#!/bin/bash

# 一键运行测试并更新文档

echo "🚀 开始自动化测试流程..."
echo ""

# 1. 运行代码检查
echo "📝 步骤 1/4: 运行代码检查..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ 代码检查失败"
  exit 1
fi
echo "✅ 代码检查通过"
echo ""

# 2. 运行测试
echo "🧪 步骤 2/4: 运行测试..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ 测试失败"
  exit 1
fi
echo "✅ 测试通过"
echo ""

# 3. 生成覆盖率报告
echo "📊 步骤 3/4: 生成覆盖率报告..."
npm run test:coverage
echo "✅ 覆盖率报告已生成"
echo ""

# 4. 更新需求文档
echo "📝 步骤 4/4: 更新需求文档..."
npm run update-requirements
echo "✅ 需求文档已更新"
echo ""

echo "🎉 自动化测试流程完成！"
echo ""
echo "查看报告："
echo "  - 测试报告: docs/test-report.md"
echo "  - 需求文档: docs/requirements.md"
echo "  - 覆盖率报告: coverage/lcov-report/index.html"
