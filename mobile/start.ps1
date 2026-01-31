# Second Brain Mobile - 快速启动脚本

Write-Host "🚀 启动外挂大脑 Android 应用..." -ForegroundColor Green

# 检查是否在 mobile 目录
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 错误: 请在 mobile 目录下运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查依赖是否安装
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
}

# 检查后端服务器是否运行
Write-Host "🔍 检查后端服务器..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
} catch {
    Write-Host "⚠️  警告: 后端服务器未运行" -ForegroundColor Yellow
    Write-Host "请在另一个终端运行: cd .. && npm run server" -ForegroundColor Yellow
    Read-Host "按 Enter 继续，或 Ctrl+C 取消"
}

# 启动 Metro
Write-Host "📱 启动 Metro 打包服务器..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow

# 等待 Metro 启动
Start-Sleep -Seconds 5

# 运行 Android 应用
Write-Host "🤖 运行 Android 应用..." -ForegroundColor Green
npm run android
