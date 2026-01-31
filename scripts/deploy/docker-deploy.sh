#!/bin/bash

# Docker 一键部署脚本
# 适用于首次部署

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Second Brain Docker 一键部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    echo "请先安装: apt install -y docker-compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}警告: .env.production 文件不存在${NC}"
    echo "正在从模板创建..."
    cp .env.production.example .env.production
    echo -e "${YELLOW}请编辑 .env.production 文件，填入您的 API Key${NC}"
    echo "nano .env.production"
    exit 1
fi

# 创建必要的目录
echo -e "${YELLOW}[1/5] 创建必要的目录...${NC}"
mkdir -p data logs nginx/conf.d certbot/conf certbot/www
echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 检查 Nginx 配置
if [ ! -f "nginx/conf.d/default.conf" ]; then
    echo -e "${YELLOW}[2/5] 创建 Nginx 配置...${NC}"
    cat > nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    echo -e "${GREEN}✓ Nginx 配置创建完成${NC}"
else
    echo -e "${YELLOW}[2/5] Nginx 配置已存在，跳过${NC}"
fi
echo ""

# 构建镜像
echo -e "${YELLOW}[3/5] 构建 Docker 镜像...${NC}"
docker-compose build
echo -e "${GREEN}✓ 镜像构建完成${NC}"
echo ""

# 启动服务
echo -e "${YELLOW}[4/5] 启动服务...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ 服务启动完成${NC}"
echo ""

# 等待服务就绪
echo -e "${YELLOW}[5/5] 等待服务就绪...${NC}"
sleep 5
echo -e "${GREEN}✓ 部署完成！${NC}"
echo ""

# 显示状态
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署成功！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
docker-compose ps
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  http://您的服务器IP"
echo "  http://machang.tech (配置域名后)"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo "  docker-compose logs -f app"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "  1. 配置域名解析指向服务器 IP"
echo "  2. 配置 HTTPS 证书（可选）"
echo ""
