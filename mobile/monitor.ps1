# 移动端性能监控脚本
# 用于监控应用的性能指标

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "外挂大脑 - 移动端性能监控" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 adb 是否可用
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ 错误: adb 未找到，请安装 Android SDK" -ForegroundColor Red
    exit 1
}

# 检查设备连接
$devices = adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "❌ 错误: 未检测到 Android 设备" -ForegroundColor Red
    Write-Host "请连接设备或启动模拟器" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 检测到 $($devices.Count) 个设备" -ForegroundColor Green
Write-Host ""

# 应用包名
$packageName = "com.secondbrain"

# 检查应用是否安装
$installed = adb shell pm list packages | Select-String $packageName
if (-not $installed) {
    Write-Host "❌ 错误: 应用未安装" -ForegroundColor Red
    Write-Host "请先运行: npm run android" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 应用已安装" -ForegroundColor Green
Write-Host ""

# 监控函数
function Monitor-Memory {
    Write-Host "📊 内存使用情况:" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    adb shell dumpsys meminfo $packageName | Select-String -Pattern "App Summary" -Context 0,10
    Write-Host ""
}

function Monitor-CPU {
    Write-Host "⚡ CPU 使用情况:" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    adb shell top -n 1 | Select-String $packageName
    Write-Host ""
}

function Monitor-Battery {
    Write-Host "🔋 电池信息:" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    adb shell dumpsys battery | Select-String -Pattern "level|status|health"
    Write-Host ""
}

function Monitor-Network {
    Write-Host "🌐 网络使用情况:" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    adb shell dumpsys package $packageName | Select-String -Pattern "Network" -Context 0,5
    Write-Host ""
}

# 主循环
Write-Host "开始监控... (按 Ctrl+C 停止)" -ForegroundColor Cyan
Write-Host ""

$interval = 5  # 监控间隔（秒）
$count = 0

try {
    while ($true) {
        $count++
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "监控周期 #$count - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""

        Monitor-Memory
        Monitor-CPU
        Monitor-Battery

        Write-Host "等待 $interval 秒..." -ForegroundColor Gray
        Write-Host ""
        Start-Sleep -Seconds $interval
    }
}
catch {
    Write-Host ""
    Write-Host "监控已停止" -ForegroundColor Yellow
}
