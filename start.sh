#!/bin/bash

echo "===================================="
echo "外挂大脑系统启动脚本"
echo "===================================="
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js"
    echo "请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未检测到 npm"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "依赖安装失败"
        exit 1
    fi
fi

echo "正在启动后端服务..."
npm run server &
SERVER_PID=$!

sleep 3

echo "正在启动前端服务..."
npm run dev

# 清理后台进程
kill $SERVER_PID 2>/dev/null

echo ""
echo "===================================="
echo "服务已停止"
echo "===================================="
