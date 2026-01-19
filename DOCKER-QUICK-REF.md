# Docker 快速参考

## 一、快速部署（5分钟）

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
apt install -y docker-compose
```

### 2. 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production  # 填入 GOOGLE_API_KEY
```

### 3. 启动服务

**简化版（推荐新手）**：

```bash
docker-compose -f docker-compose.simple.yml up -d
```

**完整版（带 Nginx）**：

```bash
./docker-deploy.sh
```

## 二、常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 数据备份

```bash
# 备份数据库
cp data/brain.db backup/brain-$(date +%Y%m%d).db

# 备份整个项目
tar -czf secondbrain-backup.tar.gz .
```

## 三、配置 HTTPS

### 使用 Let's Encrypt

```bash
# 申请证书
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos \
  -d machang.tech \
  -d www.machang.tech

# 重启 Nginx
docker-compose restart nginx
```

## 四、迁移服务器

### 在旧服务器

```bash
# 打包
tar -czf backup.tar.gz data/ logs/ .env.production
```

### 在新服务器

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
apt install -y docker-compose

# 上传并解压代码
scp backup.tar.gz root@新服务器:/var/www/SecondBrain/
cd /var/www/SecondBrain
tar -xzf backup.tar.gz

# 启动
docker-compose up -d
```

## 五、故障排查

### 查看日志

```bash
# 应用日志
docker-compose logs -f app

# 所有服务日志
docker-compose logs -f

# 最近 100 行
docker-compose logs --tail=100 app
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 查看文件
docker-compose exec app ls -la /app/data
```

### 重建容器

```bash
# 完全重建
docker-compose down
docker-compose up -d --build --force-recreate
```

### 清理空间

```bash
# 清理未使用的镜像
docker system prune -a

# 查看磁盘使用
docker system df
```

## 六、性能监控

```bash
# 查看资源使用
docker stats

# 查看容器详情
docker inspect second-brain

# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' second-brain
```

## 七、配置文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | Docker 镜像构建文件 |
| `docker-compose.yml` | 完整版配置（含 Nginx） |
| `docker-compose.simple.yml` | 简化版配置 |
| `.dockerignore` | 构建时忽略的文件 |
| `.env.production` | 环境变量配置 |
| `nginx/conf.d/default.conf` | Nginx 配置 |

## 八、端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | HTTP | Web 访问 |
| 443 | HTTPS | 安全访问 |
| 3000 | 应用 | 后端 API（容器内部） |

## 九、环境变量

必需：
- `GOOGLE_API_KEY` - Google AI API 密钥

可选：
- `DISABLE_ANON` - 禁用匿名访问
- `FEISHU_SYNC_ENABLED` - 启用飞书同步

## 十、最佳实践

1. ✅ 定期备份数据库（每天）
2. ✅ 配置 HTTPS 证书
3. ✅ 设置日志轮转
4. ✅ 监控容器健康状态
5. ✅ 定期更新镜像
6. ✅ 使用 `.env` 文件管理敏感信息
7. ✅ 配置防火墙规则

## 十一、对比传统部署

| 项目 | 传统部署 | Docker 部署 |
|------|---------|------------|
| 初次部署 | 30-60 分钟 | 5-10 分钟 |
| 环境配置 | 复杂 | 简单 |
| 迁移服务器 | 重新配置 | 复制文件 |
| 更新应用 | 多步骤 | 一条命令 |
| 环境一致性 | 可能不同 | 完全一致 |
| 隔离性 | 共享环境 | 完全隔离 |

**推荐使用 Docker 部署！**
