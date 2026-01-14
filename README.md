# 外挂大脑 - Second Brain



一个用于积累和组织日常见闻、随笔、文章、音视频和书籍等多类型内容的个人知识管理工具。



## ✨ 功能特性



- 📝 多类型内容管理（随笔、文章、音视频、书籍）

- 🏷️ 灵活的标签系统

- ⭐ 评分系统（1-5星）

- ❤️ 收藏功能

- 🔍 全文搜索

- 📊 访问统计

- 🎨 简洁直观的用户界面



## 🚀 快速开始



### 环境要求

- Node.js >= 20.x (推荐使用 20.19.6 LTS)
- npm >= 10.x
- 推荐使用 nvm 管理 Node.js 版本

### 安装步骤

1. **安装依赖**

```bash
npm install
```

2. **启动服务**

#### 方式一：使用启动脚本（推荐）

**Windows 系统：**
```powershell
# PowerShell 脚本（推荐）
.\scripts\start.ps1

# 或使用批处理文件（已移除，请使用 PowerShell 脚本）
```

**Linux/Mac 系统：**
```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

#### 方式二：Python 脚本

```bash
python scripts/start.py
```

#### 方式二：手动启动



#### Windows 系统

在命令行执行：

```bash

.\scripts\start.ps1

```



#### Linux/Mac 系统

```bash

chmod +x scripts/start.sh

./scripts/start.sh

```



#### 手动启动

```bash

# 终端1 - 启动后端服务

npm run server



# 终端2 - 启动前端开发服务器

npm run dev

```



3. **访问应用**



浏览器访问 http://localhost:5173



- 后端API服务：http://localhost:3000

- 前端开发服务：http://localhost:5173



## 📂 项目结构



```

second-brain/

├── data/              # 数据存储目录（SQLite数据库）

├── server/            # 后端服务

│   ├── index.js      # Express服务入口

│   ├── routes/       # API路由

│   └── models/       # 数据访问层

├── src/               # 前端源码

│   ├── views/        # 页面组件

│   ├── stores/       # Pinia状态管理

│   ├── router/       # Vue Router路由配置

│   ├── utils/        # 工具函数

│   └── assets/       # 静态资源

├── index.html         # HTML入口

├── package.json       # 项目配置

├── vite.config.js     # Vite配置
├── scripts/           # 启动脚本
│   ├── start.ps1
│   ├── start.sh
│   └── start.py

```



## 🛠️ 技术栈



- **前端**: Vue 3 + Vite + Pinia + Vue Router

- **后端**: Node.js + Express

- **数据库**: SQLite3

- **样式**: 原生CSS



## 📖 使用说明



### 创建内容



1. 点击首页右上角的"+ 新建内容"按钮

2. 选择内容类型（随笔/文章/音视频/书籍）

3. 填写标题和内容

4. 可选：添加来源、评分、标签

5. 点击"保存"按钮



### 管理标签



- 在编辑内容时，可以选择已有标签或创建新标签

- 标签支持自定义颜色

- 标签可在首页左侧筛选栏中使用



### 搜索和筛选



- 使用首页顶部搜索框进行全文搜索

- 左侧筛选栏提供类型、收藏状态、标签筛选

- 支持组合筛选



### 收藏内容



- 在内容卡片或详情页点击星标图标

- 在筛选栏选择"已收藏"查看收藏的内容



## 💾 数据备份



数据库文件位于 `data/brain.db`，建议定期备份：



```bash

# 复制数据库文件到安全位置

cp data/brain.db /path/to/backup/brain_backup_$(date +%Y%m%d).db

```



## 🔧 配置说明



### 端口配置



- **后端端口**: 在 `server/index.js` 中修改 `PORT` 变量（默认3000）

- **前端端口**: 在 `vite.config.js` 中修改 `server.port`（默认5173）



## 📝 API文档



### 内容管理



- `GET /api/contents` - 获取内容列表

- `GET /api/contents/:id` - 获取内容详情

- `POST /api/contents` - 创建内容

- `PUT /api/contents/:id` - 更新内容

- `DELETE /api/contents/:id` - 删除内容

- `POST /api/contents/:id/favorite` - 切换收藏状态

- `POST /api/contents/:id/access` - 记录访问日志



### 标签管理



- `GET /api/tags` - 获取标签列表

- `POST /api/tags` - 创建标签



### 统计信息



- `GET /api/stats` - 获取统计数据



## 🐛 常见问题



### Q: 启动后无法访问？

A: 确保已安装依赖（npm install），检查端口是否被占用。



### Q: 数据丢失怎么办？

A: 定期备份 `data/brain.db` 文件。数据库文件不会被git追踪。



### Q: Node.js版本过旧？

A: 本项目需要 Node.js >= 16.x，请升级到最新LTS版本。



## 📄 许可证



MIT License



## 🤝 贡献



欢迎提交Issue和Pull Request！

