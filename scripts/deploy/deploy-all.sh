#!/bin/bash

# 外挂大脑 - 一键部署脚本（包含 Android 端）

set -e

echo "🚀 外挂大脑 - 完整部署脚本"
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 1. 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
npm install

# 2. 构建前端
echo ""
echo "🏗️  构建前端..."
npm run build

# 3. 检查环境变量
echo ""
echo "🔍 检查环境变量..."
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在，使用默认配置"
    cp .env.example .env 2>/dev/null || true
fi

# 4. 初始化数据库
echo ""
echo "💾 初始化数据库..."
mkdir -p data
if [ ! -f "data/brain.db" ]; then
    echo "创建新数据库..."
fi

# 5. 安装 Android 端依赖（可选）
echo ""
read -p "是否安装 Android 端依赖？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📱 安装 Android 端依赖..."
    cd mobile
    npm install
    cd ..
    echo "✅ Android 端依赖安装完成"
fi

# 6. 启动服务
echo ""
echo "🎉 部署完成！"
echo ""
echo "启动命令："
echo "  后端: npm run server"
echo "  前端: npm run dev"
echo "  Android: cd mobile && npm run android"
echo ""
echo "或使用快速启动："
echo "  python start.py"
echo ""
echo "访问地址："
echo "  Web: http://localhost:5173"
echo "  API: http://localhost:3000"
echo ""
echo "文档："
echo "  项目文档: PROJECT.md"
echo "  Android 快速开始: mobile/QUICKSTART.md"
echo ""
