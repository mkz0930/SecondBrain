# 外挂大脑 - 一键部署脚本（包含 Android 端）

Write-Host "🚀 外挂大脑 - 完整部署脚本" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 Node.js" -ForegroundColor Red
    exit 1
}

# 1. 安装后端依赖
Write-Host ""
Write-Host "📦 安装后端依赖..." -ForegroundColor Cyan
npm install

# 2. 构建前端
Write-Host ""
Write-Host "🏗️  构建前端..." -ForegroundColor Cyan
npm run build

# 3. 检查环境变量
Write-Host ""
Write-Host "🔍 检查环境变量..." -ForegroundColor Cyan
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  警告: .env 文件不存在，使用默认配置" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
    }
}

# 4. 初始化数据库
Write-Host ""
Write-Host "💾 初始化数据库..." -ForegroundColor Cyan
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
}
if (-not (Test-Path "data/brain.db")) {
    Write-Host "创建新数据库..." -ForegroundColor Yellow
}

# 5. 安装 Android 端依赖（可选）
Write-Host ""
$installMobile = Read-Host "是否安装 Android 端依赖？(y/n)"
if ($installMobile -eq "y" -or $installMobile -eq "Y") {
    Write-Host "📱 安装 Android 端依赖..." -ForegroundColor Cyan
    Push-Location mobile
    npm install
    Pop-Location
    Write-Host "✅ Android 端依赖安装完成" -ForegroundColor Green
}

# 6. 完成
Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "启动命令：" -ForegroundColor Yellow
Write-Host "  后端: npm run server"
Write-Host "  前端: npm run dev"
Write-Host "  Android: cd mobile && npm run android"
Write-Host ""
Write-Host "或使用快速启动：" -ForegroundColor Yellow
Write-Host "  python start.py"
Write-Host ""
Write-Host "访问地址：" -ForegroundColor Yellow
Write-Host "  Web: http://localhost:5173"
Write-Host "  API: http://localhost:3000"
Write-Host ""
Write-Host "文档：" -ForegroundColor Yellow
Write-Host "  项目文档: PROJECT.md"
Write-Host "  Android 快速开始: mobile/QUICKSTART.md"
Write-Host ""
