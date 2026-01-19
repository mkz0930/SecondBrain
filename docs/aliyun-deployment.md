# 阿里云部署指南 - machang.tech

本指南帮助您将"外挂大脑"应用快速部署到阿里云服务器，并绑定域名 machang.tech。

## 一、准备工作

### 1.1 购买阿里云服务器（ECS）

**推荐配置**：
- CPU: 2核
- 内存: 2GB 或 4GB
- 系统盘: 40GB
- 操作系统: **Ubuntu 22.04 LTS** 或 CentOS 8
- 带宽: 1-5 Mbps（按需选择）
- 地域: 选择离您最近的区域（如华北、华东）

**购买链接**：https://ecs.console.aliyun.com/

### 1.2 配置安全组规则

在阿里云 ECS 控制台，配置安全组，开放以下端口：

| 端口 | 协议 | 说明 |
|------|------|------|
| 22 | TCP | SSH 登录 |
| 80 | TCP | HTTP 访问 |
| 443 | TCP | HTTPS 访问 |
| 3000 | TCP | 后端 API（可选，建议通过 Nginx 代理） |

### 1.3 域名解析配置

登录阿里云域名控制台：https://dc.console.aliyun.com/

添加 DNS 解析记录：

| 记录类型 | 主机记录 | 记录值 | 说明 |
|---------|---------|--------|------|
| A | @ | 您的服务器公网IP | 访问 machang.tech |
| A | www | 您的服务器公网IP | 访问 www.machang.tech |

**生效时间**：通常 10 分钟内生效

## 二、服务器环境配置

### 2.1 连接服务器

使用 SSH 连接到您的阿里云服务器：

```bash
ssh root@您的服务器IP
```

### 2.2 安装 Node.js

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x（推荐版本）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v18.x.x
npm -v   # 应显示 9.x.x
```

### 2.3 安装 PM2（进程管理器）

```bash
sudo npm install -g pm2

# 设置 PM2 开机自启
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

### 2.4 安装 Nginx（Web 服务器）

```bash
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装
sudo systemctl status nginx
```

### 2.5 安装 Git

```bash
sudo apt install -y git
```

## 三、部署应用

### 3.1 克隆代码

```bash
# 创建应用目录
mkdir -p /var/www
cd /var/www

# 克隆您的代码仓库（替换为您的仓库地址）
git clone https://github.com/您的用户名/SecondBrain.git
cd SecondBrain
```

**如果没有 Git 仓库**，可以使用 FTP 或 SCP 上传代码：

```bash
# 在本地电脑上执行（Windows PowerShell）
scp -r D:\code\SecondBrain root@您的服务器IP:/var/www/
```

### 3.2 安装依赖

```bash
cd /var/www/SecondBrain
npm install --production
```

### 3.3 配置环境变量

创建生产环境配置文件：

```bash
nano .env.production
```

添加以下内容（根据实际情况修改）：

```env
# 服务器端口
PORT=3000

# Google AI API Key（必需）
GOOGLE_API_KEY=您的Google_API_Key
# 或使用 Gemini API Key
GEMINI_API_KEY=您的Gemini_API_Key

# 禁用匿名访问（可选）
DISABLE_ANON=false

# 飞书同步（可选）
FEISHU_SYNC_ENABLED=true

# 数据库路径
DB_PATH=./data/brain.db

# 生产环境标识
NODE_ENV=production
```

保存文件（Ctrl+O，Enter，Ctrl+X）

### 3.4 构建前端

```bash
npm run build
```

构建完成后，前端静态文件会生成在 `dist/` 目录。

### 3.5 启动后端服务

使用 PM2 启动后端：

```bash
pm2 start server/index.js --name second-brain

# 保存 PM2 配置
pm2 save

# 查看运行状态
pm2 status
pm2 logs second-brain
```

## 四、配置 Nginx

### 4.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/machang.tech
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name machang.tech www.machang.tech;

    # 前端静态文件
    root /var/www/SecondBrain/dist;
    index index.html;

    # 日志
    access_log /var/log/nginx/machang.tech.access.log;
    error_log /var/log/nginx/machang.tech.error.log;

    # 前端路由支持（Vue Router history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/machang.tech /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 4.3 测试访问

在浏览器中访问：http://machang.tech

如果能看到您的应用，说明部署成功！

## 五、配置 HTTPS（SSL 证书）

### 5.1 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 申请免费 SSL 证书

```bash
sudo certbot --nginx -d machang.tech -d www.machang.tech
```

按提示输入邮箱，同意服务条款，Certbot 会自动配置 Nginx 并申请证书。

### 5.3 自动续期

Certbot 会自动设置定时任务续期证书，测试续期：

```bash
sudo certbot renew --dry-run
```

### 5.4 测试 HTTPS

访问：https://machang.tech

应该能看到绿色的安全锁标识。

## 六、日常维护

### 6.1 更新代码

```bash
cd /var/www/SecondBrain

# 拉取最新代码
git pull

# 安装新依赖（如果有）
npm install --production

# 重新构建前端
npm run build

# 重启后端服务
pm2 restart second-brain
```

### 6.2 查看日志

```bash
# 查看 PM2 日志
pm2 logs second-brain

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/machang.tech.access.log
sudo tail -f /var/log/nginx/machang.tech.error.log

# 查看应用日志
tail -f /var/www/SecondBrain/logs/combined-*.log
```

### 6.3 备份数据库

```bash
# 创建备份目录
mkdir -p /var/backups/secondbrain

# 备份数据库
cp /var/www/SecondBrain/data/brain.db /var/backups/secondbrain/brain-$(date +%Y%m%d).db

# 设置定时备份（每天凌晨 2 点）
crontab -e
# 添加以下行：
0 2 * * * cp /var/www/SecondBrain/data/brain.db /var/backups/secondbrain/brain-$(date +\%Y\%m\%d).db
```

### 6.4 监控服务状态

```bash
# 查看 PM2 进程
pm2 status

# 查看系统资源
htop  # 需要先安装: sudo apt install htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

## 七、常见问题

### 7.1 无法访问网站

**检查清单**：
1. 域名解析是否生效：`ping machang.tech`
2. 安全组端口是否开放（80、443）
3. Nginx 是否运行：`sudo systemctl status nginx`
4. 后端服务是否运行：`pm2 status`

### 7.2 API 请求失败

**检查**：
1. 后端日志：`pm2 logs second-brain`
2. Nginx 配置是否正确：`sudo nginx -t`
3. 环境变量是否配置：检查 `.env.production`

### 7.3 前端页面空白

**检查**：
1. 前端是否构建：检查 `dist/` 目录是否有文件
2. Nginx 配置的 root 路径是否正确
3. 浏览器控制台是否有错误

### 7.4 数据库文件权限问题

```bash
# 确保数据库目录有写权限
sudo chown -R root:root /var/www/SecondBrain/data
sudo chmod -R 755 /var/www/SecondBrain/data
```

## 八、性能优化建议

### 8.1 启用 Gzip 压缩

编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/nginx.conf
```

确保以下配置已启用：

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### 8.2 配置 PM2 集群模式

```bash
pm2 delete second-brain
pm2 start server/index.js --name second-brain -i 2  # 启动 2 个实例
pm2 save
```

### 8.3 配置 Nginx 缓存

在 Nginx 配置中添加：

```nginx
# 在 http 块中添加
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

# 在 location /api 块中添加
proxy_cache api_cache;
proxy_cache_valid 200 5m;
proxy_cache_key "$scheme$request_method$host$request_uri";
```

## 九、安全加固

### 9.1 配置防火墙

```bash
# 安装 UFW
sudo apt install -y ufw

# 配置规则
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 9.2 修改 SSH 端口（可选）

```bash
sudo nano /etc/ssh/sshd_config
# 修改 Port 22 为其他端口，如 2222
sudo systemctl restart sshd
```

### 9.3 禁用 root 登录（可选）

创建普通用户后：

```bash
sudo nano /etc/ssh/sshd_config
# 设置 PermitRootLogin no
sudo systemctl restart sshd
```

## 十、快速部署脚本

为了更快速部署，可以使用以下一键部署脚本。

创建 `deploy.sh`：

```bash
#!/bin/bash

echo "开始部署 Second Brain..."

# 进入项目目录
cd /var/www/SecondBrain

# 拉取最新代码
echo "拉取最新代码..."
git pull

# 安装依赖
echo "安装依赖..."
npm install --production

# 构建前端
echo "构建前端..."
npm run build

# 重启后端服务
echo "重启后端服务..."
pm2 restart second-brain

# 重启 Nginx
echo "重启 Nginx..."
sudo systemctl restart nginx

echo "部署完成！"
pm2 status
```

使用方法：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 总结

完成以上步骤后，您的"外挂大脑"应用就成功部署到 machang.tech 了！

**访问地址**：
- HTTP: http://machang.tech
- HTTPS: https://machang.tech

**下一步**：
1. 配置 Google AI API Key 以启用 AI 功能
2. 创建用户账号并开始使用
3. 配置飞书同步（如需要）
4. 设置定期备份

如有问题，请查看日志文件或联系技术支持。
