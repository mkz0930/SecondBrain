#!/bin/bash

# Second Brain Mobile - 快速启动脚本

echo "🚀 启动外挂大脑 Android 应用..."

# 检查是否在 mobile 目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 mobile 目录下运行此脚本"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查后端服务器是否运行
echo "🔍 检查后端服务器..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "⚠️  警告: 后端服务器未运行"
    echo "请在另一个终端运行: cd .. && npm run server"
    read -p "按 Enter 继续，或 Ctrl+C 取消..."
fi

# 启动 Metro
echo "📱 启动 Metro 打包服务器..."
npm start &
METRO_PID=$!

# 等待 Metro 启动
sleep 5

# 运行 Android 应用
echo "🤖 运行 Android 应用..."
npm run android

# 清理
trap "kill $METRO_PID" EXIT
