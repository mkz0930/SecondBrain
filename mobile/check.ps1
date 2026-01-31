# 项目完整性检查脚本
# 用于验证所有必要的文件和配置是否正确

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "外挂大脑 - 项目完整性检查" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 计数器
$script:Total = 0
$script:Passed = 0
$script:Failed = 0

# 检查函数
function Test-FileExists {
    param($Path, $Description)
    $script:Total++
    if (Test-Path $Path -PathType Leaf) {
        Write-Host "✓ $Description" -ForegroundColor Green
        $script:Passed++
        return $true
    } else {
        Write-Host "✗ $Description (文件不存在: $Path)" -ForegroundColor Red
        $script:Failed++
        return $false
    }
}

function Test-DirectoryExists {
    param($Path, $Description)
    $script:Total++
    if (Test-Path $Path -PathType Container) {
        Write-Host "✓ $Description" -ForegroundColor Green
        $script:Passed++
        return $true
    } else {
        Write-Host "✗ $Description (目录不存在: $Path)" -ForegroundColor Red
        $script:Failed++
        return $false
    }
}

# 检查文档文件
Write-Host "检查文档文件..." -ForegroundColor Blue
Test-FileExists "README.md" "完整项目文档"
Test-FileExists "QUICKSTART.md" "快速开始指南"
Test-FileExists "DEVELOPMENT.md" "开发文档"
Test-FileExists "TESTING_GUIDE.md" "测试指南"
Test-FileExists "TROUBLESHOOTING.md" "故障排除指南"
Test-FileExists "CONTRIBUTING.md" "贡献指南"
Test-FileExists "OPTIMIZATION_SUMMARY.md" "优化总结"
Test-FileExists "PROJECT_SUMMARY.md" "项目总结"
Test-FileExists "FINAL_REPORT.md" "完整报告"
Test-FileExists "CHANGELOG.md" "更新日志"
Test-FileExists "INDEX.md" "文档索引"
Test-FileExists "OVERVIEW.md" "项目概览"
Test-FileExists "COMPLETION.md" "完成总结"
Write-Host ""

# 检查工具脚本
Write-Host "检查工具脚本..." -ForegroundColor Blue
Test-FileExists "start.sh" "启动脚本 (Linux/Mac)"
Test-FileExists "start.ps1" "启动脚本 (Windows)"
Test-FileExists "deploy.sh" "部署脚本 (Linux/Mac)"
Test-FileExists "deploy.ps1" "部署脚本 (Windows)"
Test-FileExists "monitor.sh" "监控脚本 (Linux/Mac)"
Test-FileExists "monitor.ps1" "监控脚本 (Windows)"
Write-Host ""

# 检查配置文件
Write-Host "检查配置文件..." -ForegroundColor Blue
Test-FileExists "package.json" "依赖配置"
Test-FileExists ".env.example" "环境配置示例"
Test-FileExists "babel.config.js" "Babel配置"
Test-FileExists "metro.config.js" "Metro配置"
Write-Host ""

# 检查源代码目录
Write-Host "检查源代码目录..." -ForegroundColor Blue
Test-DirectoryExists "src" "源代码目录"
Test-DirectoryExists "src\screens" "界面组件目录"
Test-DirectoryExists "src\services" "服务层目录"
Test-DirectoryExists "src\database" "数据库目录"
Test-DirectoryExists "src\utils" "工具类目录"
Test-DirectoryExists "android" "Android原生代码目录"
Write-Host ""

# 检查核心源代码文件
Write-Host "检查核心源代码文件..." -ForegroundColor Blue
Test-FileExists "src\App.js" "应用入口"
Test-FileExists "src\screens\HomeScreen.js" "主页界面"
Test-FileExists "src\screens\ContentListScreen.js" "内容列表界面"
Test-FileExists "src\screens\SettingsScreen.js" "设置界面"
Test-FileExists "src\services\ClipboardService.js" "剪贴板服务"
Test-FileExists "src\services\SyncService.js" "同步服务"
Test-FileExists "src\services\ApiService.js" "API服务"
Test-FileExists "src\services\NotificationService.js" "通知服务"
Test-FileExists "src\database\ClipboardQueue.js" "离线队列"
Test-FileExists "src\utils\PerformanceMonitor.js" "性能监控"
Test-FileExists "src\utils\Logger.js" "日志记录"
Test-FileExists "src\utils\urlValidator.js" "URL验证"
Write-Host ""

# 检查Android配置
Write-Host "检查Android配置..." -ForegroundColor Blue
Test-FileExists "android\app\src\main\AndroidManifest.xml" "Android清单文件"
Test-FileExists "android\app\build.gradle" "App构建配置"
Test-FileExists "android\build.gradle" "项目构建配置"
Test-FileExists "android\settings.gradle" "项目设置"
Write-Host ""

# 显示统计结果
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "检查完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "总计: $Total 项"
Write-Host "通过: $Passed 项" -ForegroundColor Green
if ($Failed -gt 0) {
    Write-Host "失败: $Failed 项" -ForegroundColor Red
} else {
    Write-Host "失败: 0 项" -ForegroundColor Green
}
Write-Host ""

# 计算完成率
$Percentage = [math]::Round(($Passed / $Total) * 100, 2)
Write-Host "完成率: $Percentage%"
Write-Host ""

# 根据结果返回状态码
if ($Failed -eq 0) {
    Write-Host "✓ 项目完整性检查通过！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ 项目完整性检查失败，请检查缺失的文件" -ForegroundColor Red
    exit 1
}
