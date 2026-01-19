# Second Brain - 外挂大脑

> 一个用于积累和组织日常见闻、随笔、文章、音视频和书籍等多类型内容的个人知识管理工具。通过 AI 驱动的内容分析和飞书双向同步，帮助你构建属于自己的第二大脑。

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.x-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 核心理念

> **"第二大脑"不是简单的笔记工具，而是你个人知识的延伸和增强。**

- **积累为王** - 每天记录一点，长期积累形成知识资产
- **AI 增强** - 自动分析、分类、摘要，降低整理成本
- **多维连接** - 通过标签、时间、类型构建知识网络
- **随时随地** - Web 端 + 飞书集成，多端无缝访问

## 功能特性

### 内容管理
- **多类型支持** - 随笔、文章、音视频、书籍
- **灵活标签** - 自定义标签 + 颜色区分
- **评分系统** - 1-5 星评分，智能推荐
- **收藏功能** - 快速标记重要内容
- **全文搜索** - 标题 + 内容全文检索

### AI 能力
- **智能分析** - 自动提取标题、摘要、类型、标签
- **内容优化** - AI 自动整理和格式化内容
- **每日总结** - 基于当日内容生成智能日报
- **研究助手** - 对话式研究工作流，AI 辅助深度研究
- **多模型降级** - 自动切换最优 AI 模型

### 飞书集成
- **双向同步** - 本地与飞书表格实时同步
- **增量更新** - 只同步变更，节省资源
- **冲突解决** - 基于时间戳的智能合并
- **加密存储** - 敏感信息 AES 加密

### 用户体验
- **时间轴视图** - 按日期分组展示内容
- **响应式设计** - 适配桌面和移动设备
- **Markdown 渲染** - 富文本内容展示
- **访问统计** - 记录内容访问次数
- **知识图谱** - 可视化展示知识关联

### 研究助手 🆕
- **对话式交互** - AI 引导完成研究流程
- **需求分析** - 自动生成研究问题
- **资料收集** - 智能搜索本地内容库
- **相关度评分** - AI 评估资料相关性
- **知识图谱** - 可视化资料关联关系
- **报告生成** - 自动生成结构化研究报告

详见 [研究助手文档](docs/research-assistant.md)

## 快速开始

### 环境要求

- **Node.js** >= 20.x (推荐使用 LTS 版本)
- **npm** >= 10.x
- 推荐使用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 版本

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/second-brain.git
cd second-brain

# 安装依赖
npm install
```

### 配置

创建 `.env` 文件（可选）：

```bash
# Google AI API Key（必需，AI 功能）
GOOGLE_API_KEY=your_api_key_here

# 后端端口（默认 3000）
PORT=3000

# 禁用匿名访问（可选）
DISABLE_ANON=true

# 启用飞书同步（可选）
FEISHU_SYNC_ENABLED=true
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

### 启动

**推荐：使用启动脚本（自动启动前后端）**

```bash
# Windows
.\scripts\start.ps1

# Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh
```

**或使用 Python 脚本**

```bash
python scripts/start.py
```

**手动启动（需要两个终端）**

```bash
# 终端 1 - 启动后端
npm run server

# 终端 2 - 启动前端
npm run dev
```

### 访问

- 前端地址：http://localhost:5173
- 后端 API：http://localhost:3000

## 项目结构

```
second-brain/
├── data/                   # 数据存储目录（SQLite 数据库）
├── docs/                   # 项目文档
│   ├── architecture.md     # 架构设计文档
│   ├── api.md              # API 接口文档
│   ├── database.md         # 数据库设计文档
│   ├── development.md      # 开发指南
│   ├── user-guide.md       # 用户使用指南
│   ├── research-assistant.md  # 研究助手功能文档
│   ├── research-api.md     # 研究助手 API 文档
│   └── research-quickstart.md # 研究助手快速开始
├── logs/                   # 日志文件目录
├── scripts/                # 启动和工具脚本
│   ├── start.ps1           # Windows 启动脚本
│   ├── start.sh            # Linux/Mac 启动脚本
│   └── start.py            # Python 启动脚本
├── server/                 # 后端服务
│   ├── index.js            # Express 服务入口
│   ├── middleware/         # 中间件
│   │   └── auth.js         # 认证中间件
│   ├── models/             # 数据访问层
│   │   ├── database.js     # 数据库操作
│   │   └── users.js        # 用户模型
│   ├── routes/             # API 路由
│   │   ├── auth.js         # 认证路由
│   │   ├── contents.js     # 内容路由
│   │   ├── daily-summary.js # 每日总结路由
│   │   ├── feishu.js       # 飞书同步路由
│   │   ├── research.js     # 研究助手路由
│   │   ├── stats.js        # 统计路由
│   │   └── tags.js         # 标签路由
│   ├── services/           # 业务逻辑层
│   │   ├── ai-service.js   # AI 服务
│   │   ├── daily-summary-service.js # 每日总结服务
│   │   ├── feishu-adapter.js # 飞书 API 适配器
│   │   ├── research-service.js  # 研究助手服务
│   │   ├── sync-scheduler.js  # 同步调度器
│   │   ├── sync-service.js    # 同步服务
│   │   └── sync-state.js      # 同步状态管理
│   └── utils/              # 后端工具
│       └── logger.js       # 日志工具
├── src/                    # 前端源码
│   ├── router/             # Vue Router 配置
│   │   └── index.js
│   ├── stores/             # Pinia 状态管理
│   │   ├── content.js      # 内容状态
│   │   ├── research.js     # 研究助手状态
│   │   ├── tag.js          # 标签状态
│   │   └── user.js         # 用户状态
│   ├── utils/              # 前端工具
│   │   └── helpers.js
│   ├── views/              # 页面组件
│   │   ├── ContentDetailView.vue  # 内容详情
│   │   ├── ContentEditView.vue    # 内容编辑
│   │   ├── HomeView.vue           # 主页
│   │   ├── LoginView.vue          # 登录页
│   │   ├── ResearchListView.vue   # 研究项目列表
│   │   └── ResearchDialogueView.vue # 研究对话界面
│   ├── components/         # 公共组件
│   │   ├── BackToTop.vue   # 返回顶部
│   │   └── KnowledgeGraph.vue # 知识图谱
│   ├── api.js              # HTTP 封装
│   └── main.js             # 应用入口
├── index.html              # HTML 入口
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
└── CLAUDE.md               # Claude Code 开发指南
```

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Vue 3 + Composition API |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 构建工具 | Vite |
| 后端框架 | Express.js |
| 数据库 | SQLite3 |
| AI 服务 | Google Generative AI (Gemini) |
| 日志 | Winston |
| 定时任务 | node-cron |

## 文档索引

| 文档 | 描述 |
|------|------|
| [用户使用指南](docs/user-guide.md) | 功能使用说明 |
| [研究助手快速开始](docs/research-quickstart.md) | 研究助手使用教程 |
| [研究助手功能文档](docs/research-assistant.md) | 研究助手详细说明 |
| [研究助手 API](docs/research-api.md) | 研究助手 API 接口 |
| [架构设计文档](docs/architecture.md) | 系统架构和设计原理 |
| [开发指南](docs/development.md) | 开发环境配置和规范 |
| [API 文档](docs/api.md) | REST API 接口说明 |
| [数据库设计文档](docs/database.md) | 数据库表结构和关系 |

## 常见问题

<details>
<summary>启动后无法访问？</summary>

确保已安装依赖（npm install），检查端口是否被占用。Windows 用户可能需要以管理员身份运行 PowerShell 脚本。
</details>

<details>
<summary>AI 功能不可用？</summary>

检查是否配置了 GOOGLE_API_KEY 环境变量。确保 API Key 有效且有足够配额。
</details>

<details>
<summary>如何备份数据？</summary>

定期备份 data/brain.db 文件。数据库文件不会被 git 追踪。
</details>

<details>
<summary>Node.js 版本过旧？</summary>

本项目需要 Node.js >= 20.x。使用 nvm 安装最新 LTS 版本：nvm install 20
</details>

## 路线图

- [x] 研究助手功能（对话式研究工作流）
- [x] 知识图谱可视化
- [ ] 支持更多 AI 模型（Claude、GPT）
- [ ] 网络资源搜索（研究助手）
- [ ] 导出功能（Markdown、PDF）
- [ ] OCR 图片文字识别
- [ ] 语音输入支持
- [ ] 浏览器插件（快速收藏）
- [ ] 移动端原生应用

## 许可证

[MIT License](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ by knowledge enthusiasts**
