@echo off
REM 一键运行测试并更新文档

echo 🚀 开始自动化测试流程...
echo.

REM 1. 运行代码检查
echo 📝 步骤 1/4: 运行代码检查...
call npm run lint
if %errorlevel% neq 0 (
  echo ❌ 代码检查失败
  exit /b 1
)
echo ✅ 代码检查通过
echo.

REM 2. 运行测试
echo 🧪 步骤 2/4: 运行测试...
call npm test
if %errorlevel% neq 0 (
  echo ❌ 测试失败
  exit /b 1
)
echo ✅ 测试通过
echo.

REM 3. 生成覆盖率报告
echo 📊 步骤 3/4: 生成覆盖率报告...
call npm run test:coverage
echo ✅ 覆盖率报告已生成
echo.

REM 4. 更新需求文档
echo 📝 步骤 4/4: 更新需求文档...
call npm run update-requirements
echo ✅ 需求文档已更新
echo.

echo 🎉 自动化测试流程完成！
echo.
echo 查看报告：
echo   - 测试报告: docs\test-report.md
echo   - 需求文档: docs\requirements.md
echo   - 覆盖率报告: coverage\lcov-report\index.html

pause
