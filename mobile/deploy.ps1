# 快速部署脚本 - Android 端
# 用于快速构建和部署应用

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "外挂大脑 - Android 快速部署" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查命令是否存在
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# 打印错误信息
function Write-Error-Message {
    param($Message)
    Write-Host "❌ 错误: $Message" -ForegroundColor Red
    exit 1
}

# 打印成功信息
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# 打印警告信息
function Write-Warning-Message {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# 检查必要的工具
Write-Host "检查环境..." -ForegroundColor Yellow

if (-not (Test-Command node)) {
    Write-Error-Message "Node.js 未安装"
}
Write-Success "Node.js 已安装"

if (-not (Test-Command npm)) {
    Write-Error-Message "npm 未安装"
}
Write-Success "npm 已安装"

if (-not (Test-Command adb)) {
    Write-Error-Message "adb 未安装，请安装 Android SDK"
}
Write-Success "adb 已安装"

Write-Host ""

# 检查设备连接
Write-Host "检查设备连接..." -ForegroundColor Yellow
$devices = adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Error-Message "未检测到 Android 设备，请连接设备或启动模拟器"
}
Write-Success "检测到 $($devices.Count) 个设备"

Write-Host ""

# 进入 mobile 目录
Set-Location $PSScriptRoot

# 安装依赖
Write-Host "安装依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
    Write-Success "依赖安装完成"
} else {
    Write-Warning-Message "依赖已存在，跳过安装"
}

Write-Host ""

# 清理缓存
Write-Host "清理缓存..." -ForegroundColor Yellow
Remove-Item -Path "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
Write-Success "缓存清理完成"

Write-Host ""

# 构建应用
Write-Host "构建应用..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
Write-Success "应用构建完成"

Write-Host ""

# 安装应用
Write-Host "安装应用..." -ForegroundColor Yellow
Set-Location ..
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Error-Message "APK 文件不存在: $apkPath"
}

adb install -r $apkPath
Write-Success "应用安装完成"

Write-Host ""

# 启动应用
Write-Host "启动应用..." -ForegroundColor Yellow
adb shell am start -n com.secondbrain/.MainActivity
Write-Success "应用已启动"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "部署完成！" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：" -ForegroundColor Yellow
Write-Host "1. 应用已安装并启动"
Write-Host "2. 请在设置中配置服务器地址和登录信息"
Write-Host "3. 开启剪贴板监听功能"
Write-Host ""
Write-Host "查看日志：" -ForegroundColor Yellow
Write-Host "  adb logcat | Select-String 'clipboard|sync|api'"
Write-Host ""
