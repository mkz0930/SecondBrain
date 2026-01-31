#!/bin/bash

# 快速部署脚本 - Android 端
# 用于快速构建和部署应用

set -e  # 遇到错误立即退出

echo "=========================================="
echo "外挂大脑 - Android 快速部署"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 打印错误信息
error() {
    echo -e "${RED}❌ 错误: $1${NC}"
    exit 1
}

# 打印成功信息
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 打印警告信息
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查必要的工具
echo "检查环境..."

if ! command_exists node; then
    error "Node.js 未安装"
fi
success "Node.js 已安装"

if ! command_exists npm; then
    error "npm 未安装"
fi
success "npm 已安装"

if ! command_exists adb; then
    error "adb 未安装，请安装 Android SDK"
fi
success "adb 已安装"

echo ""

# 检查设备连接
echo "检查设备连接..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    error "未检测到 Android 设备，请连接设备或启动模拟器"
fi
success "检测到 $DEVICE_COUNT 个设备"

echo ""

# 进入 mobile 目录
cd "$(dirname "$0")"

# 安装依赖
echo "安装依赖..."
if [ ! -d "node_modules" ]; then
    npm install
    success "依赖安装完成"
else
    warning "依赖已存在，跳过安装"
fi

echo ""

# 清理缓存
echo "清理缓存..."
rm -rf android/app/build
rm -rf android/.gradle
success "缓存清理完成"

echo ""

# 构建应用
echo "构建应用..."
cd android
./gradlew clean
./gradlew assembleDebug
success "应用构建完成"

echo ""

# 安装应用
echo "安装应用..."
cd ..
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    error "APK 文件不存在: $APK_PATH"
fi

adb install -r "$APK_PATH"
success "应用安装完成"

echo ""

# 启动应用
echo "启动应用..."
adb shell am start -n com.secondbrain/.MainActivity
success "应用已启动"

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "提示："
echo "1. 应用已安装并启动"
echo "2. 请在设置中配置服务器地址和登录信息"
echo "3. 开启剪贴板监听功能"
echo ""
echo "查看日志："
echo "  adb logcat | grep -i 'clipboard\\|sync\\|api'"
echo ""
