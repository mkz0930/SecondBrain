#!/bin/bash

# 移动端性能监控脚本
# 用于监控应用的性能指标

echo "=========================================="
echo "外挂大脑 - 移动端性能监控"
echo "=========================================="
echo ""

# 检查 adb 是否可用
if ! command -v adb &> /dev/null; then
    echo "❌ 错误: adb 未找到，请安装 Android SDK"
    exit 1
fi

# 检查设备连接
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ 错误: 未检测到 Android 设备"
    echo "请连接设备或启动模拟器"
    exit 1
fi

echo "✅ 检测到 $DEVICE_COUNT 个设备"
echo ""

# 应用包名
PACKAGE_NAME="com.secondbrain"

# 检查应用是否安装
if ! adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "❌ 错误: 应用未安装"
    echo "请先运行: npm run android"
    exit 1
fi

echo "✅ 应用已安装"
echo ""

# 监控函数
monitor_memory() {
    echo "📊 内存使用情况:"
    echo "----------------------------------------"
    adb shell dumpsys meminfo "$PACKAGE_NAME" | grep -A 10 "App Summary"
    echo ""
}

monitor_cpu() {
    echo "⚡ CPU 使用情况:"
    echo "----------------------------------------"
    adb shell top -n 1 | grep "$PACKAGE_NAME"
    echo ""
}

monitor_battery() {
    echo "🔋 电池信息:"
    echo "----------------------------------------"
    adb shell dumpsys battery | grep -E "level|status|health"
    echo ""
}

monitor_network() {
    echo "🌐 网络使用情况:"
    echo "----------------------------------------"
    adb shell dumpsys package "$PACKAGE_NAME" | grep -A 5 "Network"
    echo ""
}

# 主循环
echo "开始监控... (按 Ctrl+C 停止)"
echo ""

INTERVAL=5  # 监控间隔（秒）
COUNT=0

while true; do
    COUNT=$((COUNT + 1))
    echo "=========================================="
    echo "监控周期 #$COUNT - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""

    monitor_memory
    monitor_cpu
    monitor_battery

    echo "等待 $INTERVAL 秒..."
    echo ""
    sleep $INTERVAL
done
