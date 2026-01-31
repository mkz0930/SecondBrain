#!/bin/bash

# Second Brain 快速部署脚本
# 用于阿里云服务器快速更新部署

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Second Brain 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录下运行此脚本${NC}"
    exit 1
fi

# 1. 拉取最新代码
echo -e "${YELLOW}[1/5] 拉取最新代码...${NC}"
git pull origin main || {
    echo -e "${RED}代码拉取失败，请检查 Git 配置${NC}"
    exit 1
}
echo -e "${GREEN}✓ 代码更新完成${NC}"
echo ""

# 2. 安装依赖
echo -e "${YELLOW}[2/5] 安装依赖...${NC}"
npm install --production || {
    echo -e "${RED}依赖安装失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 3. 构建前端
echo -e "${YELLOW}[3/5] 构建前端...${NC}"
npm run build || {
    echo -e "${RED}前端构建失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 4. 重启后端服务
echo -e "${YELLOW}[4/5] 重启后端服务...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart second-brain || {
        echo -e "${YELLOW}警告: PM2 重启失败，尝试启动新进程...${NC}"
        pm2 start server/index.js --name second-brain
    }
    pm2 save
    echo -e "${GREEN}✓ 后端服务重启完成${NC}"
else
    echo -e "${RED}错误: PM2 未安装，请先安装 PM2: npm install -g pm2${NC}"
    exit 1
fi
echo ""

# 5. 重启 Nginx（可选）
echo -e "${YELLOW}[5/5] 重启 Nginx...${NC}"
if command -v nginx &> /dev/null; then
    sudo systemctl restart nginx || {
        echo -e "${YELLOW}警告: Nginx 重启失败，可能需要手动重启${NC}"
    }
    echo -e "${GREEN}✓ Nginx 重启完成${NC}"
else
    echo -e "${YELLOW}警告: Nginx 未安装或不在 PATH 中${NC}"
fi
echo ""

# 显示服务状态
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}服务状态:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo "  pm2 logs second-brain"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  http://machang.tech"
echo "  https://machang.tech"
echo ""
