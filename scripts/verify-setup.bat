@echo off
REM 自动化测试系统验证脚本 (Windows)
REM 用于验证所有配置是否正确

echo 🔍 验证自动化测试系统配置...
echo.

set PASSED=0
set FAILED=0
set WARNINGS=0

REM 检查配置文件
echo 📋 检查配置文件...
call :check_file "package.json" "package.json"
call :check_file ".mocharc.json" "Mocha 配置"
call :check_file ".eslintrc.cjs" "ESLint 配置"
call :check_file ".env.test" "测试环境变量"
call :check_file "test\setup.js" "测试初始化文件"
echo.

REM 检查测试目录
echo 📁 检查测试目录...
call :check_dir "test" "测试根目录"
call :check_dir "test\api" "API 测试目录"
call :check_dir "test\services" "服务层测试目录"
call :check_dir "test\frontend" "前端测试目录"
echo.

REM 检查测试文件
echo 📝 检查测试文件...
call :check_file "test\api\contents.test.js" "内容 API 测试"
call :check_file "test\api\tags.test.js" "标签 API 测试"
call :check_file "test\api\auth.test.js" "认证 API 测试"
call :check_file "test\services\ai-service.test.js" "AI 服务测试"
call :check_file "test\services\sync-service.test.js" "同步服务测试"
call :check_file "test\frontend\components.test.js" "前端组件测试"
echo.

REM 检查 Git Hooks
echo 🔧 检查 Git Hooks...
call :check_file ".git\hooks\pre-commit" "pre-commit hook"
call :check_file ".git\hooks\pre-commit.bat" "pre-commit hook (Windows)"
call :check_file ".git\hooks\pre-push" "pre-push hook"
call :check_file ".git\hooks\pre-push.bat" "pre-push hook (Windows)"
echo.

REM 检查 CI/CD 配置
echo 🚀 检查 CI/CD 配置...
call :check_file ".github\workflows\ci-cd.yml" "GitHub Actions 工作流"
echo.

REM 检查脚本文件
echo 📜 检查脚本文件...
call :check_file "scripts\update-requirements.js" "需求文档更新脚本"
call :check_file "scripts\setup-testing.sh" "安装脚本 (Linux/Mac)"
call :check_file "scripts\setup-testing.bat" "安装脚本 (Windows)"
call :check_file "scripts\run-all-tests.sh" "测试脚本 (Linux/Mac)"
call :check_file "scripts\run-all-tests.bat" "测试脚本 (Windows)"
echo.

REM 检查文档
echo 📚 检查文档...
call :check_file "TESTING.md" "测试使用指南"
call :check_file "docs\automation-guide.md" "自动化指南"
call :check_file "docs\automation-summary.md" "完成总结"
call :check_file "docs\testing-quickstart.md" "快速开始"
call :check_file "docs\test-report.md" "测试报告"
echo.

REM 检查系统命令
echo 🔨 检查系统命令...
call :check_command "node" "Node.js"
call :check_command "npm" "npm"
call :check_command "git" "Git"
echo.

REM 总结
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 验证结果:
echo ✓ 通过: %PASSED%
if %WARNINGS% gtr 0 echo ⚠ 警告: %WARNINGS%
if %FAILED% gtr 0 echo ✗ 失败: %FAILED%
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if %FAILED% gtr 0 (
  echo ❌ 配置验证失败！
  echo.
  echo 建议操作：
  echo 1. 运行 'npm install' 安装依赖
  echo 2. 运行 '.\scripts\setup-testing.bat' 设置测试环境
  echo 3. 检查缺失的文件和目录
  pause
  exit /b 1
) else if %WARNINGS% gtr 0 (
  echo ⚠️  配置验证通过，但有警告
  echo.
  echo 建议操作：
  echo 1. 检查警告信息并修复
  pause
  exit /b 0
) else (
  echo ✅ 配置验证完全通过！
  echo.
  echo 下一步：
  echo 1. 运行 'npm test' 执行测试
  echo 2. 运行 'npm run test:coverage' 查看覆盖率
  echo 3. 查看 'TESTING.md' 了解更多使用方法
  pause
  exit /b 0
)

REM 检查文件函数
:check_file
if exist %~1 (
  echo ✓ %~2
  set /a PASSED+=1
) else (
  echo ✗ %~2 ^(文件不存在: %~1^)
  set /a FAILED+=1
)
goto :eof

REM 检查目录函数
:check_dir
if exist %~1\ (
  echo ✓ %~2
  set /a PASSED+=1
) else (
  echo ✗ %~2 ^(目录不存在: %~1^)
  set /a FAILED+=1
)
goto :eof

REM 检查命令函数
:check_command
where %~1 >nul 2>&1
if %errorlevel% equ 0 (
  echo ✓ %~2
  set /a PASSED+=1
) else (
  echo ⚠ %~2 ^(命令不存在: %~1^)
  set /a WARNINGS+=1
)
goto :eof
