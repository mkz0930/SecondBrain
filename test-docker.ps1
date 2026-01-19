# Windows 本地 Docker 测试脚本
# 使用方法：.\test-docker.ps1

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Second Brain 本地 Docker 测试" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 检查 Docker 是否运行
Write-Host "[1/5] 检查 Docker 环境..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✓ Docker 运行正常" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker 未运行或未安装" -ForegroundColor Red
    Write-Host "请先启动 Docker Desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 检查环境变量文件
Write-Host "[2/5] 检查环境变量配置..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "创建 .env.local 文件..." -ForegroundColor Yellow
    Copy-Item ".env.production.example" ".env.local"
    Write-Host "✓ 已创建 .env.local" -ForegroundColor Green
    Write-Host "提示: 如需测试 AI 功能，请编辑 .env.local 填入 GOOGLE_API_KEY" -ForegroundColor Cyan
} else {
    Write-Host "✓ .env.local 已存在" -ForegroundColor Green
}
Write-Host ""

# 创建必要的目录
Write-Host "[3/5] 创建数据目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path ".\data" | Out-Null
New-Item -ItemType Directory -Force -Path ".\logs" | Out-Null
Write-Host "✓ 目录创建完成" -ForegroundColor Green
Write-Host ""

# 构建镜像
Write-Host "[4/5] 构建 Docker 镜像（首次需要 5-10 分钟）..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 镜像构建完成" -ForegroundColor Green
} else {
    Write-Host "✗ 镜像构建失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 启动容器
Write-Host "[5/5] 启动容器..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 容器启动成功" -ForegroundColor Green
} else {
    Write-Host "✗ 容器启动失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 等待服务就绪
Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 显示状态
Write-Host "========================================" -ForegroundColor Green
Write-Host "  测试部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

docker-compose -f docker-compose.local.yml ps

Write-Host ""
Write-Host "访问地址:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "查看日志:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "停止服务:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.local.yml down" -ForegroundColor Cyan
Write-Host ""
Write-Host "正在打开浏览器..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080"
