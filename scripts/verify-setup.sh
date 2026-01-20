#!/bin/bash

# 自动化测试系统验证脚本
# 用于验证所有配置是否正确

echo "🔍 验证自动化测试系统配置..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $2 (文件不存在: $1)"
    ((FAILED++))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $2 (目录不存在: $1)"
    ((FAILED++))
  fi
}

check_command() {
  if command -v $1 &> /dev/null; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $2 (命令不存在: $1)"
    ((WARNINGS++))
  fi
}

check_npm_script() {
  if grep -q "\"$1\"" package.json; then
    echo -e "${GREEN}✓${NC} npm script: $1"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} npm script: $1 (未在 package.json 中找到)"
    ((FAILED++))
  fi
}

echo "📋 检查配置文件..."
check_file "package.json" "package.json"
check_file ".mocharc.json" "Mocha 配置"
check_file ".eslintrc.cjs" "ESLint 配置"
check_file ".env.test" "测试环境变量"
check_file "test/setup.js" "测试初始化文件"
echo ""

echo "📁 检查测试目录..."
check_dir "test" "测试根目录"
check_dir "test/api" "API 测试目录"
check_dir "test/services" "服务层测试目录"
check_dir "test/frontend" "前端测试目录"
echo ""

echo "📝 检查测试文件..."
check_file "test/api/contents.test.js" "内容 API 测试"
check_file "test/api/tags.test.js" "标签 API 测试"
check_file "test/api/auth.test.js" "认证 API 测试"
check_file "test/services/ai-service.test.js" "AI 服务测试"
check_file "test/services/sync-service.test.js" "同步服务测试"
check_file "test/frontend/components.test.js" "前端组件测试"
echo ""

echo "🔧 检查 Git Hooks..."
check_file ".git/hooks/pre-commit" "pre-commit hook"
check_file ".git/hooks/pre-push" "pre-push hook"
if [ -f ".git/hooks/pre-commit" ]; then
  if [ -x ".git/hooks/pre-commit" ]; then
    echo -e "${GREEN}✓${NC} pre-commit hook 可执行"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} pre-commit hook 不可执行 (运行: chmod +x .git/hooks/pre-commit)"
    ((WARNINGS++))
  fi
fi
if [ -f ".git/hooks/pre-push" ]; then
  if [ -x ".git/hooks/pre-push" ]; then
    echo -e "${GREEN}✓${NC} pre-push hook 可执行"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} pre-push hook 不可执行 (运行: chmod +x .git/hooks/pre-push)"
    ((WARNINGS++))
  fi
fi
echo ""

echo "🚀 检查 CI/CD 配置..."
check_file ".github/workflows/ci-cd.yml" "GitHub Actions 工作流"
echo ""

echo "📜 检查脚本文件..."
check_file "scripts/update-requirements.js" "需求文档更新脚本"
check_file "scripts/setup-testing.sh" "安装脚本 (Linux/Mac)"
check_file "scripts/setup-testing.bat" "安装脚本 (Windows)"
check_file "scripts/run-all-tests.sh" "测试脚本 (Linux/Mac)"
check_file "scripts/run-all-tests.bat" "测试脚本 (Windows)"
echo ""

echo "📚 检查文档..."
check_file "TESTING.md" "测试使用指南"
check_file "docs/automation-guide.md" "自动化指南"
check_file "docs/automation-summary.md" "完成总结"
check_file "docs/testing-quickstart.md" "快速开始"
check_file "docs/test-report.md" "测试报告"
echo ""

echo "📦 检查 npm scripts..."
check_npm_script "test"
check_npm_script "test:watch"
check_npm_script "test:coverage"
check_npm_script "test:api"
check_npm_script "test:services"
check_npm_script "lint"
check_npm_script "update-requirements"
echo ""

echo "🔨 检查系统命令..."
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "git" "Git"
echo ""

echo "📊 检查 npm 依赖..."
if [ -f "package.json" ]; then
  if grep -q "mocha" package.json; then
    echo -e "${GREEN}✓${NC} Mocha 已安装"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Mocha 未安装"
    ((FAILED++))
  fi

  if grep -q "chai" package.json; then
    echo -e "${GREEN}✓${NC} Chai 已安装"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Chai 未安装"
    ((FAILED++))
  fi

  if grep -q "supertest" package.json; then
    echo -e "${GREEN}✓${NC} Supertest 已安装"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Supertest 未安装"
    ((FAILED++))
  fi

  if grep -q "eslint" package.json; then
    echo -e "${GREEN}✓${NC} ESLint 已安装"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} ESLint 未安装"
    ((FAILED++))
  fi

  if grep -q "c8" package.json; then
    echo -e "${GREEN}✓${NC} c8 已安装"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} c8 未安装"
    ((FAILED++))
  fi
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "验证结果:"
echo -e "${GREEN}✓ 通过: $PASSED${NC}"
if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ 警告: $WARNINGS${NC}"
fi
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}✗ 失败: $FAILED${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ 配置验证失败！${NC}"
  echo ""
  echo "建议操作："
  echo "1. 运行 'npm install' 安装依赖"
  echo "2. 运行 './scripts/setup-testing.sh' 设置测试环境"
  echo "3. 检查缺失的文件和目录"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  配置验证通过，但有警告${NC}"
  echo ""
  echo "建议操作："
  echo "1. 运行 'chmod +x .git/hooks/pre-commit .git/hooks/pre-push' 设置 hook 权限"
  echo "2. 检查警告信息并修复"
  exit 0
else
  echo -e "${GREEN}✅ 配置验证完全通过！${NC}"
  echo ""
  echo "下一步："
  echo "1. 运行 'npm test' 执行测试"
  echo "2. 运行 'npm run test:coverage' 查看覆盖率"
  echo "3. 查看 'TESTING.md' 了解更多使用方法"
  exit 0
fi
