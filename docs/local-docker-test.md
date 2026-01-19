# Windows 本地 Docker 测试指南

在部署到服务器之前，先在本地 Windows 环境测试 Docker 部署。

## 一、安装 Docker Desktop（10 分钟）

### 1. 下载 Docker Desktop

访问官网下载：https://www.docker.com/products/docker-desktop/

或使用国内镜像：
- 阿里云镜像：https://mirrors.aliyun.com/docker-toolbox/windows/docker-desktop/

### 2. 安装步骤

1. 双击安装包 `Docker Desktop Installer.exe`
2. 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
3. 点击 "OK" 开始安装
4. 安装完成后重启电脑

### 3. 启动 Docker Desktop

1. 启动 Docker Desktop 应用
2. 等待 Docker 引擎启动（右下角图标变绿）
3. 打开 PowerShell 验证安装：

```powershell
docker --version
docker-compose --version
```

应该看到版本信息，例如：
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

## 二、准备测试环境（5 分钟）

### 1. 打开 PowerShell

在项目目录右键选择 "在终端中打开" 或：

```powershell
cd D:\code\SecondBrain
```

### 2. 创建本地环境变量文件

```powershell
# 复制环境变量模板
Copy-Item .env.production.example .env.local

# 编辑文件（使用记事本）
notepad .env.local
```

修改以下内容：

```env
# 本地测试配置
NODE_ENV=production
PORT=3000

# 如果有 Google API Key，填入这里
GOOGLE_API_KEY=your_google_api_key_here

# 本地测试可以禁用飞书同步
FEISHU_SYNC_ENABLED=false

# 数据库路径
DB_PATH=/app/data/brain.db
```

**注意**：如果没有 Google API Key，AI 功能将无法使用，但应用仍可正常运行。

### 3. 创建本地测试用的 docker-compose 配置

```powershell
notepad docker-compose.local.yml
```

复制以下内容：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: second-brain-local
    restart: unless-stopped
    ports:
      - "8080:3000"    # 使用 8080 端口避免冲突
    env_file:
      - .env.local
    volumes:
      # 持久化数据库
      - ./data:/app/data
      # 持久化日志
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
```

保存文件。

## 三、构建和运行（5-10 分钟）

### 1. 构建 Docker 镜像

```powershell
# 构建镜像（首次需要 5-10 分钟）
docker-compose -f docker-compose.local.yml build

# 查看构建的镜像
docker images
```

### 2. 启动容器

```powershell
# 启动服务
docker-compose -f docker-compose.local.yml up -d

# 查看运行状态
docker-compose -f docker-compose.local.yml ps
```

应该看到：
```
NAME                   STATUS              PORTS
second-brain-local     Up X seconds        0.0.0.0:8080->3000/tcp
```

### 3. 查看日志

```powershell
# 查看实时日志
docker-compose -f docker-compose.local.yml logs -f

# 按 Ctrl+C 退出日志查看
```

## 四、测试访问（2 分钟）

### 1. 打开浏览器

访问：http://localhost:8080

应该能看到"外挂大脑"的登录/主页面。

### 2. 测试功能

- ✅ 注册/登录
- ✅ 创建笔记
- ✅ 添加标签
- ✅ 搜索内容
- ⚠️ AI 分析（需要 API Key）

### 3. 检查健康状态

```powershell
# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' second-brain-local
```

应该显示 `healthy`。

## 五、常用命令

### 查看状态

```powershell
# 查看容器状态
docker-compose -f docker-compose.local.yml ps

# 查看日志
docker-compose -f docker-compose.local.yml logs -f app

# 查看最近 50 行日志
docker-compose -f docker-compose.local.yml logs --tail=50 app
```

### 重启服务

```powershell
# 重启容器
docker-compose -f docker-compose.local.yml restart

# 停止容器
docker-compose -f docker-compose.local.yml stop

# 启动容器
docker-compose -f docker-compose.local.yml start
```

### 停止并删除

```powershell
# 停止并删除容器
docker-compose -f docker-compose.local.yml down

# 停止并删除容器和数据卷（会删除数据库！）
docker-compose -f docker-compose.local.yml down -v
```

### 重新构建

```powershell
# 修改代码后重新构建
docker-compose -f docker-compose.local.yml up -d --build
```

### 进入容器

```powershell
# 进入容器内部
docker exec -it second-brain-local sh

# 查看文件
ls -la /app
ls -la /app/data

# 退出容器
exit
```

## 六、常见问题

### 1. 端口被占用

**错误信息**：
```
Error: bind: address already in use
```

**解决方法**：

```powershell
# 查看 8080 端口占用
netstat -ano | findstr :8080

# 修改 docker-compose.local.yml 中的端口
ports:
  - "8081:3000"  # 改用 8081 端口
```

### 2. Docker Desktop 未启动

**错误信息**：
```
error during connect: This error may indicate that the docker daemon is not running
```

**解决方法**：
1. 启动 Docker Desktop 应用
2. 等待右下角图标变绿
3. 重新运行命令

### 3. WSL 2 未安装

**错误信息**：
```
WSL 2 installation is incomplete
```

**解决方法**：
1. 以管理员身份运行 PowerShell
2. 执行：`wsl --install`
3. 重启电脑

### 4. 构建失败

**错误信息**：
```
npm ERR! network timeout
```

**解决方法**：

```powershell
# 配置 npm 镜像（在 Dockerfile 中已配置，但可以手动设置）
# 编辑 Dockerfile，在 npm ci 前添加：
# RUN npm config set registry https://registry.npmmirror.com
```

### 5. 容器启动后立即退出

```powershell
# 查看详细日志
docker-compose -f docker-compose.local.yml logs app

# 查看容器退出原因
docker inspect second-brain-local
```

### 6. 数据库权限问题

**错误信息**：
```
SQLITE_CANTOPEN: unable to open database file
```

**解决方法**：

```powershell
# 确保 data 目录存在
New-Item -ItemType Directory -Force -Path .\data

# 重启容器
docker-compose -f docker-compose.local.yml restart
```

## 七、性能监控

### 查看资源使用

```powershell
# 查看 CPU、内存使用
docker stats second-brain-local

# 按 Ctrl+C 退出
```

### 查看磁盘使用

```powershell
# 查看 Docker 磁盘使用
docker system df

# 清理未使用的镜像和容器
docker system prune -a
```

## 八、测试完成后

### 1. 确认功能正常

- ✅ 应用能正常访问
- ✅ 可以创建和查看内容
- ✅ 数据持久化（重启容器后数据还在）
- ✅ 日志正常输出

### 2. 准备部署到服务器

如果本地测试一切正常，可以准备部署到阿里云服务器：

```powershell
# 停止本地容器
docker-compose -f docker-compose.local.yml down

# 备份数据库（如果需要）
Copy-Item .\data\brain.db .\data\brain.db.backup
```

### 3. 上传到服务器

使用 SCP 或 Git 将代码上传到服务器，然后按照 `docs/docker-deployment.md` 部署。

## 九、开发模式（可选）

如果想在 Docker 中进行开发（热重载）：

创建 `docker-compose.dev.yml`：

```yaml
version: '3.8'

services:
  app:
    image: node:18-alpine
    container_name: second-brain-dev
    working_dir: /app
    ports:
      - "5173:5173"  # 前端
      - "3000:3000"  # 后端
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: sh -c "npm install && npm run dev"
```

使用：

```powershell
docker-compose -f docker-compose.dev.yml up
```

## 十、快速参考

### 完整测试流程

```powershell
# 1. 进入项目目录
cd D:\code\SecondBrain

# 2. 创建环境变量
Copy-Item .env.production.example .env.local
notepad .env.local  # 编辑配置

# 3. 构建并启动
docker-compose -f docker-compose.local.yml up -d

# 4. 查看日志
docker-compose -f docker-compose.local.yml logs -f

# 5. 访问测试
# 浏览器打开 http://localhost:8080

# 6. 停止服务
docker-compose -f docker-compose.local.yml down
```

### 常用命令速查

| 命令 | 说明 |
|------|------|
| `docker-compose -f docker-compose.local.yml up -d` | 启动服务 |
| `docker-compose -f docker-compose.local.yml down` | 停止服务 |
| `docker-compose -f docker-compose.local.yml logs -f` | 查看日志 |
| `docker-compose -f docker-compose.local.yml ps` | 查看状态 |
| `docker-compose -f docker-compose.local.yml restart` | 重启服务 |
| `docker-compose -f docker-compose.local.yml up -d --build` | 重新构建 |
| `docker exec -it second-brain-local sh` | 进入容器 |
| `docker stats second-brain-local` | 查看资源 |

## 十一、下一步

测试成功后，您可以：

1. ✅ 部署到阿里云服务器（参考 `docs/docker-deployment.md`）
2. ✅ 配置域名 machang.tech
3. ✅ 申请 SSL 证书
4. ✅ 开始使用您的"外挂大脑"！

祝测试顺利！🎉
