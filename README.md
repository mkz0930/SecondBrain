# 外挂大脑 (Second Brain)

一个智能的个人知识管理工具，支持 **Web 端** 和 **Android 移动端**，具备内容收集、AI 分析、飞书同步和研究助手功能。

## 🎉 最新更新

**Android 端已完成！** (2026-01-20)

现在支持：
- ✅ 后台剪切板监听 - 无感检测文章链接
- ✅ 智能 URL 识别 - 自动过滤非文章内容
- ✅ 自动同步到飞书 - 与 Web 端数据互通
- ✅ 离线队列管理 - 无网络时本地缓存

查看 [Android 快速开始](mobile/QUICKSTART.md) | [完整文档](mobile/README.md)

---

## 功能特性

### Web 端功能
- **内容管理**: 支持笔记、文章、音视频、书籍等多种内容类型
- **AI 内容分析**: 自动提取标题、摘要、标签，优化内容格式
- **飞书集成**: 双向同步飞书多维表格，支持自动同步和手动触发
- **每日总结**: AI 自动生成每日内容总结
- **研究助手**: 对话式研究工具，支持需求分析、材料收集、知识图谱
- **标签管理**: 灵活的标签系统，支持颜色标记
- **全文搜索**: 快速搜索标题和内容
- **附件支持**: 上传和管理图片、文档等附件

### Android 端功能 🆕
- **剪切板监听**: 后台自动检测复制的文章链接
- **智能识别**: 自动过滤非文章 URL（图片、视频、电商等）
- **离线队列**: 无网络时本地缓存，恢复后自动同步
- **通知交互**: 检测到链接后弹出通知询问是否保存
- **自动同步**: 自动同步到后端和飞书多维表格
- **内容查看**: 查看已保存的内容列表

---

## 自动化测试

本项目已配置完整的自动化测试系统：

```bash
# 快速设置测试环境
npm install

# 运行测试
npm test                  # 运行所有测试
npm run test:watch        # 监听模式
npm run test:coverage     # 覆盖率报告

# 代码检查
npm run lint

# 更新需求文档
npm run update-requirements
```

详见：
- 📖 [自动化测试指南](docs/automation-guide.md)
- 🚀 [快速开始](docs/testing-quickstart.md)
- 📊 [测试报告](docs/test-report.md)

---

## 快速开始

### Web 端

#### 环境要求
- Node.js >= 20.x
- npm >= 10.x
- Google Gemini API Key（用于 AI 功能）

#### 安装和启动

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/second-brain.git
cd second-brain

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件，添加 GOOGLE_API_KEY

# 4. 启动应用
python start.py
# 或
npm run server  # 终端1：后端
npm run dev     # 终端2：前端
```

#### 访问
- Web 前端: http://localhost:5173
- API 后端: http://localhost:3000

### Android 端

#### 环境要求
- Node.js >= 18
- Android Studio（包含 Android SDK）
- JDK 17
- React Native CLI

#### 快速启动

```bash
# 1. 进入移动端目录
cd mobile

# 2. 安装依赖
npm install

# 3. 启动后端服务器（在项目根目录）
cd ..
npm run server

# 4. 运行 Android 应用
cd mobile
npm run android
```

详细说明请查看 [Android 快速开始指南](mobile/QUICKSTART.md)

---

## 使用说明

### Web 端基本操作

1. **添加内容**
   - 点击"新建"按钮
   - 选择内容类型（随笔/文章/音视频/书籍）
   - 输入内容或 URL
   - 保存后 AI 自动分析

2. **飞书同步**
   - 进入"飞书同步"设置
   - 配置 app_id、app_secret、table_id
   - 点击"立即同步"或等待自动同步

3. **研究助手**
   - 进入"研究助手"页面
   - 创建新研究项目
   - 与 AI 对话，完成研究流程

### Android 端基本操作

1. **首次配置**
   - 打开应用，进入"设置"
   - 登录账号
   - 开启"剪切板监听"
   - 授予通知权限

2. **日常使用**
   - 在浏览器/微信等应用复制文章链接
   - 收到通知后点击"保存"
   - 内容自动同步到飞书

3. **查看内容**
   - 主页点击"查看内容列表"
   - 下拉刷新获取最新内容

详细说明请查看 [Android 使用指南](mobile/README.md)

---

## 项目结构

```
SecondBrain/
├── src/                    # Vue 3 前端
│   ├── views/              # 页面组件
│   ├── stores/             # Pinia 状态管理
│   ├── router/             # 路由配置
│   └── utils/              # 工具函数
├── server/                 # Express 后端
│   ├── routes/             # API 路由
│   ├── services/           # 业务逻辑
│   ├── models/             # 数据模型
│   └── middleware/         # 中间件
├── mobile/                 # React Native Android 端 🆕
│   ├── src/
│   │   ├── screens/        # 页面组件
│   │   ├── services/       # 服务层
│   │   ├── database/       # 数据库
│   │   └── utils/          # 工具函数
│   └── android/            # Android 配置
├── data/                   # SQLite 数据库
├── docs/                   # 项目文档
└── scripts/                # 启动脚本
```

---

## 文档

### 项目文档
- [需求文档](docs/REQUIREMENTS.md) - 项目整体需求
- [架构设计](docs/ARCHITECTURE.md) - 系统架构
- [更新日志](docs/CHANGELOG.md) - 版本更新记录

### Web 端文档
- [用户使用指南](docs/user-guide.md) - 功能使用说明
- [API 文档](docs/api.md) - REST API 接口
- [数据库结构](docs/database.md) - 数据库设计
- [架构设计](docs/ARCHITECTURE.md) - 系统架构
- [开发指南](docs/development.md) - 开发环境配置
- [研究助手使用指南](docs/research-user-guide.md) - 研究助手教程
- [知识图谱功能](docs/knowledge-graph.md) - 知识图谱说明
- [附件功能](docs/attachment-feature.md) - 附件管理
- [部署指南](docs/DEPLOYMENT.md) - 生产环境部署

### Android 端文档 🆕
- [Android 快速开始](mobile/QUICKSTART.md) - 5分钟上手
- [Android 完整文档](mobile/README.md) - 功能说明
- [Android 开发文档](mobile/DEVELOPMENT.md) - 开发详情
- [Android 完成报告](docs/android-completion-report.md) - 开发总结

---

## 技术栈

### Web 端
- **前端**: Vue 3 + Pinia + Vue Router + Vite
- **后端**: Express.js + SQLite
- **AI**: Google Generative AI (Gemini)

### Android 端 🆕
- **框架**: React Native 0.73
- **导航**: React Navigation 6
- **数据库**: SQLite
- **后台服务**: react-native-background-actions
- **通知**: react-native-push-notification

---

## 部署

### 开发环境
```bash
# Web 端
npm run server  # 后端
npm run dev     # 前端

# Android 端
cd mobile && npm run android
```

### 生产环境

#### Docker 部署
```bash
docker build -t second-brain .
docker-compose up -d
```

#### 传统部署
```bash
npm run build
pm2 start ecosystem.config.json
```

详见 [部署指南](DEPLOYMENT.md) 和 [Docker 部署](docs/docker-deployment.md)

---

## 常见问题

### Web 端

**Q: 启动后无法访问？**
- 确保已安装依赖（`npm install`）
- 检查端口是否被占用
- Windows 用户可能需要管理员权限

**Q: AI 功能不可用？**
- 检查是否配置了 `GOOGLE_API_KEY`
- 确保 API Key 有效且有配额

### Android 端

**Q: 监听不工作？**
- 检查监听开关是否打开
- 检查通知权限是否授予
- 将应用加入电池优化白名单

**Q: 同步失败？**
- 检查网络连接
- 确认服务器地址正确
- 查看同步统计中的错误信息

详见各模块的 README 文档

---

## 路线图

- [x] Web 端内容管理
- [x] AI 内容分析
- [x] 飞书双向同步
- [x] 研究助手功能
- [x] 知识图谱可视化
- [x] Android 剪切板监听 🆕
- [ ] iOS 版本（Share Extension）
- [ ] 浏览器插件
- [ ] 支持更多 AI 模型
- [ ] 网络资源搜索
- [ ] 导出功能（Markdown、PDF）

---

## 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

---

## 许可证

[MIT License](LICENSE)

---

## 联系方式

- 项目地址: [GitHub](https://github.com/your-repo/second-brain)
- 问题反馈: [Issues](https://github.com/your-repo/second-brain/issues)
- 文档: `docs/` 目录

---

**Made with ❤️ by knowledge enthusiasts**

**最后更新**: 2026-01-20 | **版本**: 1.0.0 | **状态**: ✅ 生产就绪
