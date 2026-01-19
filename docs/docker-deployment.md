# Docker 部署指南 - machang.tech

使用 Docker 部署"外挂大脑"应用，快速、简单、易迁移。

## 为什么选择 Docker？

✅ **部署快速** - 5 分钟完成环境配置
✅ **环境一致** - 开发和生产环境完全相同
✅ **易于迁移** - 换服务器只需复制文件和一条命令
✅ **隔离性好** - 不污染服务器环境
✅ **易于管理** - 启动、停止、更新都很简单
✅ **自动重启** - 服务异常自动恢复

## 快速开始（10 分钟上线）

### 1. 安装 Docker

**阿里云 Ubuntu/Debian 服务器**：

```bash
# 一键安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 启动 Docker
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
apt install -y docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 2. 上传代码

**方式一：Git 克隆**

```bash
cd /var/www
git clone https://github.com/您的用户名/SecondBrain.git
cd SecondBrain
```

**方式二：SCP 上传**

在本地电脑执行：

```powershell
scp -r D:\code\SecondBrain root@您的服务器IP:/var/www/
```

### 3. 配置环境变量

```bash
cd /var/www/SecondBrain

# 复制环境变量模板
cp .env.production.example .env.production

# 编辑配置
nano .env.production
```

最少需要配置：

```env
GOOGLE_API_KEY=您的Google_API_Key
```

### 4. 创建 Nginx 配置

```bash
mkdir -p nginx/conf.d
nano nginx/conf.d/default.conf
```

复制以下内容：

```nginx
server {
    listen 80;
    server_name machang.tech www.machang.tech;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 其他请求重定向到 HTTPS（配置 SSL 后启用）
    # location / {
    #     return 301 https://$server_name$request_uri;
    # }

    # 临时配置：直接代理到应用（未配置 SSL 时使用）
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS 配置（配置 SSL 后启用）
# server {
#     listen 443 ssl http2;
#     server_name machang.tech www.machang.tech;
#
#     ssl_certificate /etc/letsencrypt/live/machang.tech/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/machang.tech/privkey.pem;
#
#     location / {
#         proxy_pass http://app:3000;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#     }
# }
```

### 5. 启动应用

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 6. 配置域名解析

在阿里云域名控制台添加 A 记录：

```
主机记录: @          记录值: 您的服务器IP
主机记录: www        记录值: 您的服务器IP
```

### 7. 测试访问

打开浏览器访问：http://machang.tech

看到应用界面说明部署成功！

## 配置 HTTPS（免费 SSL 证书）

### 方式一：使用 Certbot 容器（推荐）

```bash
# 申请证书
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email 您的邮箱@example.com \
  --agree-tos \
  --no-eff-email \
  -d machang.tech \
  -d www.machang.tech

# 修改 Nginx 配置，启用 HTTPS 部分（取消注释）
nano nginx/conf.d/default.conf

# 重启 Nginx
docker-compose restart nginx
```

### 方式二：使用阿里云免费证书

1. 在阿里云 SSL 证书控制台申请免费证书
2. 下载 Nginx 格式证书
3. 上传到服务器 `nginx/ssl/` 目录
4. 修改 Nginx 配置指向证书文件

## 日常维护

### 查看服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app

# 查看 Nginx 日志
docker-compose logs -f nginx
```

### 更新应用

```bash
cd /var/www/SecondBrain

# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build

# 查看状态
docker-compose ps
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart app
docker-compose restart nginx
```

### 停止服务

```bash
# 停止所有服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器和数据卷（危险！会删除数据库）
docker-compose down -v
```

### 备份数据库

```bash
# 创建备份目录
mkdir -p /var/backups/secondbrain

# 备份数据库
cp /var/www/SecondBrain/data/brain.db \
   /var/backups/secondbrain/brain-$(date +%Y%m%d).db

# 设置定时备份（每天凌晨 2 点）
crontab -e
# 添加：
0 2 * * * cp /var/www/SecondBrain/data/brain.db /var/backups/secondbrain/brain-$(date +\%Y\%m\%d).db
```

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理未使用的镜像和容器
docker system prune -a
```

## 迁移到新服务器（超简单！）

这是 Docker 部署的最大优势 - 迁移非常简单！

### 1. 在新服务器安装 Docker

```bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
apt install -y docker-compose
```

### 2. 复制整个项目目录

**在旧服务器上打包**：

```bash
cd /var/www
tar -czf secondbrain-backup.tar.gz SecondBrain/
```

**传输到新服务器**：

```bash
scp secondbrain-backup.tar.gz root@新服务器IP:/var/www/
```

**在新服务器上解压**：

```bash
cd /var/www
tar -xzf secondbrain-backup.tar.gz
cd SecondBrain
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 修改域名解析

将域名 A 记录指向新服务器 IP。

完成！整个迁移过程不超过 10 分钟。

## 简化版 docker-compose.yml（不使用 Nginx）

如果您想更简单的部署，可以不使用 Nginx，直接暴露应用端口：

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: second-brain
    restart: unless-stopped
    ports:
      - "80:3000"
      - "443:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

使用这个配置，应用会直接监听 80 端口。

## 性能优化

### 1. 使用多阶段构建（已配置）

Dockerfile 已使用多阶段构建，减小镜像体积。

### 2. 配置资源限制

编辑 `docker-compose.yml`，添加资源限制：

```yaml
services:
  app:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 3. 启用日志轮转

```yaml
services:
  app:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 安全配置

### 1. 配置防火墙

```bash
# 安装 UFW
apt install -y ufw

# 配置规则
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS

# 启用防火墙
ufw enable
```

### 2. 使用 Docker secrets（生产环境推荐）

创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  app:
    secrets:
      - google_api_key
    environment:
      - GOOGLE_API_KEY_FILE=/run/secrets/google_api_key

secrets:
  google_api_key:
    file: ./secrets/google_api_key.txt
```

使用：

```bash
mkdir -p secrets
echo "your_api_key" > secrets/google_api_key.txt
chmod 600 secrets/google_api_key.txt
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. 定期更新镜像

```bash
# 更新基础镜像
docker-compose pull

# 重新构建
docker-compose up -d --build
```

## 监控和告警

### 使用 Docker 自带的健康检查

Dockerfile 中已配置健康检查，查看状态：

```bash
docker inspect --format='{{.State.Health.Status}}' second-brain-app
```

### 集成 Prometheus + Grafana（可选）

添加到 `docker-compose.yml`：

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

## 常见问题

### 1. 容器无法启动

```bash
# 查看详细日志
docker-compose logs app

# 检查配置
docker-compose config

# 重新构建
docker-compose up -d --build --force-recreate
```

### 2. 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep :80

# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:3000"  # 改用 8080 端口
```

### 3. 数据库文件权限问题

```bash
# 修复权限
chown -R 1000:1000 data/
chmod -R 755 data/
```

### 4. 内存不足

```bash
# 查看容器内存使用
docker stats

# 增加 swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### 5. 镜像构建失败

```bash
# 清理 Docker 缓存
docker builder prune -a

# 使用国内镜像源
# 编辑 /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.docker-cn.com"
  ]
}

# 重启 Docker
systemctl restart docker
```

## 开发环境使用 Docker

### 开发模式 docker-compose

创建 `docker-compose.dev.yml`：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: frontend-builder
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5173:5173"
      - "3000:3000"
    environment:
      - NODE_ENV=development
    command: npm run dev
```

使用：

```bash
docker-compose -f docker-compose.dev.yml up
```

## 总结

Docker 部署的优势：

| 对比项 | 传统部署 | Docker 部署 |
|--------|---------|------------|
| 环境配置 | 30-60 分钟 | 5-10 分钟 |
| 迁移服务器 | 重新配置环境 | 复制文件即可 |
| 环境一致性 | 可能不一致 | 完全一致 |
| 隔离性 | 共享系统环境 | 完全隔离 |
| 回滚 | 困难 | 简单 |
| 扩展 | 手动配置 | 一条命令 |

**推荐使用 Docker 部署！**

## 下一步

1. ✅ 配置 HTTPS 证书
2. ✅ 设置定期备份
3. ✅ 配置监控告警
4. ✅ 优化性能参数

有问题随时查看日志或联系技术支持！
