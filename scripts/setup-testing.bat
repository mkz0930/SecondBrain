@echo off
REM 安装测试依赖脚本 (Windows)

echo 📦 安装测试依赖...

call npm install --save-dev mocha@^10.2.0 chai@^4.3.10 chai-http@^4.4.0 c8@^8.0.1 eslint@^8.50.0 eslint-plugin-vue@^9.17.0 supertest@^6.3.3

echo ✅ 测试依赖安装完成！
echo.
echo ✅ 自动化测试环境配置完成！
echo.
echo 运行以下命令开始测试：
echo   npm test              # 运行所有测试
echo   npm run test:watch    # 监听模式
echo   npm run test:coverage # 覆盖率报告

pause
