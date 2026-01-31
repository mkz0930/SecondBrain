#!/bin/bash

# 项目完整性检查脚本
# 用于验证所有必要的文件和配置是否正确

set -e

echo "=========================================="
echo "外挂大脑 - 项目完整性检查"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 计数器
TOTAL=0
PASSED=0
FAILED=0

# 检查函数
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2 (文件不存在: $1)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

check_dir() {
    TOTAL=$((TOTAL + 1))
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2 (目录不存在: $1)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 检查文档文件
echo -e "${BLUE}检查文档文件...${NC}"
check_file "README.md" "完整项目文档"
check_file "QUICKSTART.md" "快速开始指南"
check_file "DEVELOPMENT.md" "开发文档"
check_file "TESTING_GUIDE.md" "测试指南"
check_file "TROUBLESHOOTING.md" "故障排除指南"
check_file "CONTRIBUTING.md" "贡献指南"
check_file "OPTIMIZATION_SUMMARY.md" "优化总结"
check_file "PROJECT_SUMMARY.md" "项目总结"
check_file "FINAL_REPORT.md" "完整报告"
check_file "CHANGELOG.md" "更新日志"
check_file "INDEX.md" "文档索引"
check_file "OVERVIEW.md" "项目概览"
check_file "COMPLETION.md" "完成总结"
echo ""

# 检查工具脚本
echo -e "${BLUE}检查工具脚本...${NC}"
check_file "start.sh" "启动脚本 (Linux/Mac)"
check_file "start.ps1" "启动脚本 (Windows)"
check_file "deploy.sh" "部署脚本 (Linux/Mac)"
check_file "deploy.ps1" "部署脚本 (Windows)"
check_file "monitor.sh" "监控脚本 (Linux/Mac)"
check_file "monitor.ps1" "监控脚本 (Windows)"
echo ""

# 检查配置文件
echo -e "${BLUE}检查配置文件...${NC}"
check_file "package.json" "依赖配置"
check_file ".env.example" "环境配置示例"
check_file "babel.config.js" "Babel配置"
check_file "metro.config.js" "Metro配置"
echo ""

# 检查源代码目录
echo -e "${BLUE}检查源代码目录...${NC}"
check_dir "src" "源代码目录"
check_dir "src/screens" "界面组件目录"
check_dir "src/services" "服务层目录"
check_dir "src/database" "数据库目录"
check_dir "src/utils" "工具类目录"
check_dir "android" "Android原生代码目录"
echo ""

# 检查核心源代码文件
echo -e "${BLUE}检查核心源代码文件...${NC}"
check_file "src/App.js" "应用入口"
check_file "src/screens/HomeScreen.js" "主页界面"
check_file "src/screens/ContentListScreen.js" "内容列表界面"
check_file "src/screens/SettingsScreen.js" "设置界面"
check_file "src/services/ClipboardService.js" "剪贴板服务"
check_file "src/services/SyncService.js" "同步服务"
check_file "src/services/ApiService.js" "API服务"
check_file "src/services/NotificationService.js" "通知服务"
check_file "src/database/ClipboardQueue.js" "离线队列"
check_file "src/utils/PerformanceMonitor.js" "性能监控"
check_file "src/utils/Logger.js" "日志记录"
check_file "src/utils/urlValidator.js" "URL验证"
echo ""

# 检查Android配置
echo -e "${BLUE}检查Android配置...${NC}"
check_file "android/app/src/main/AndroidManifest.xml" "Android清单文件"
check_file "android/app/build.gradle" "App构建配置"
check_file "android/build.gradle" "项目构建配置"
check_file "android/settings.gradle" "项目设置"
echo ""

# 显示统计结果
echo "=========================================="
echo -e "${BLUE}检查完成${NC}"
echo "=========================================="
echo ""
echo "总计: $TOTAL 项"
echo -e "${GREEN}通过: $PASSED 项${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}失败: $FAILED 项${NC}"
else
    echo -e "${GREEN}失败: 0 项${NC}"
fi
echo ""

# 计算完成率
PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "完成率: $PERCENTAGE%"
echo ""

# 根据结果返回状态码
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 项目完整性检查通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 项目完整性检查失败，请检查缺失的文件${NC}"
    exit 1
fi
