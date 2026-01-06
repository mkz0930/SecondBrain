@echo off
chcp 65001 >nul
echo ====================================
echo 外挂大脑系统启动脚本
echo ====================================
echo.

REM 检查并设置Node.js版本
where nvm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    if exist ".nvmrc" (
        echo 检测到 .nvmrc 文件，正在切换 Node 版本...
        call nvm use 20.19.6
    )
)

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未检测到 Node.js
    echo 请先安装 Node.js ^(https://nodejs.org/^)
    pause
    exit /b 1
)

REM 检查npm是否安装
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未检测到 npm
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo 依赖安装失败
        pause
        exit /b 1
    )
)

echo 正在启动后端服务...
start "Second Brain Backend" cmd /k "npm run server"

timeout /t 3 >nul

echo 正在启动前端服务...
start "Second Brain Frontend" cmd /k "npm run dev"

echo.
echo ====================================
echo 服务启动中...
echo 后端服务: http://localhost:3000
echo 前端服务: http://localhost:5173
echo ====================================
echo.
echo 请等待浏览器自动打开，或手动访问 http://localhost:5173
echo 按任意键退出此窗口...
pause >nul
