# 快速部署指南 - machang.tech

这是一个简化版的部署步骤，帮助您快速上线。

## 前提条件

- ✅ 已购买阿里云 ECS 服务器（2核2GB，Ubuntu 22.04）
- ✅ 已注册域名 machang.tech
- ✅ 有服务器 SSH 登录权限

## 一、域名解析（5分钟）

1. 登录阿里云域名控制台：https://dc.console.aliyun.com/
2. 找到 machang.tech，点击"解析"
3. 添加两条 A 记录：

```
主机记录: @          记录值: 您的服务器IP
主机记录: www        记录值: 您的服务器IP
```

4. 等待 10 分钟生效

## 二、服务器配置（20分钟）

### 1. 连接服务器

```bash
ssh root@您的服务器IP
```

### 2. 一键安装环境

复制以下命令，粘贴到服务器执行：

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Nginx
apt install -y nginx

# 安装 Git
apt install -y git

# 验证安装
node -v && npm -v && pm2 -v && nginx -v
```

### 3. 配置安全组

在阿里云 ECS 控制台，添加安全组规则：

- 端口 22（SSH）
- 端口 80（HTTP）
- 端口 443（HTTPS）

## 三、部署应用（15分钟）

### 1. 上传代码

**方式一：使用 Git（推荐）**

```bash
cd /var/www
git clone https://github.com/您的用户名/SecondBrain.git
cd SecondBrain
```

**方式二：使用 SCP 上传**

在本地电脑（Windows PowerShell）执行：

```powershell
scp -r D:\code\SecondBrain root@您的服务器IP:/var/www/
```

### 2. 安装依赖并构建

```bash
cd /var/www/SecondBrain
npm install --production
npm run build
```

### 3. 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production
```

修改以下内容：

```env
PORT=3000
NODE_ENV=production
GOOGLE_API_KEY=您的Google_API_Key
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

### 4. 启动后端服务

```bash
pm2 start server/index.js --name second-brain
pm2 save
pm2 startup
```

## 四、配置 Nginx（10分钟）

### 1. 创建配置文件

```bash
nano /etc/nginx/sites-available/machang.tech
```

复制以下内容：

```nginx
server {
    listen 80;
    server_name machang.tech www.machang.tech;
    root /var/www/SecondBrain/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

保存：`Ctrl+O` → `Enter` → `Ctrl+X`

### 2. 启用配置

```bash
ln -s /etc/nginx/sites-available/machang.tech /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. 测试访问

打开浏览器访问：http://machang.tech

看到应用界面说明部署成功！

## 五、配置 HTTPS（5分钟）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（按提示输入邮箱）
certbot --nginx -d machang.tech -d www.machang.tech
```

完成后访问：https://machang.tech

## 六、日常更新

以后更新代码，只需执行：

```bash
cd /var/www/SecondBrain
chmod +x deploy.sh
./deploy.sh
```

## 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs second-brain

# 重启服务
pm2 restart second-brain

# 查看 Nginx 状态
systemctl status nginx

# 重启 Nginx
systemctl restart nginx
```

## 遇到问题？

1. **无法访问网站**
   - 检查域名解析：`ping machang.tech`
   - 检查安全组端口是否开放
   - 检查服务状态：`pm2 status` 和 `systemctl status nginx`

2. **API 请求失败**
   - 查看后端日志：`pm2 logs second-brain`
   - 检查环境变量：`cat .env.production`

3. **页面空白**
   - 检查前端构建：`ls -la dist/`
   - 查看浏览器控制台错误

## 完整文档

详细部署文档请查看：`docs/aliyun-deployment.md`

---

**祝您部署顺利！** 🎉
