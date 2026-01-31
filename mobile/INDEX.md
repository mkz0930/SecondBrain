# 📱 移动端项目文档索引

欢迎使用外挂大脑 Android 端！本文档提供了所有相关文档的快速导航。

---

## 🚀 快速开始

### 新用户
1. **[快速开始指南](QUICKSTART.md)** ⭐ - 5分钟快速上手
2. **[完整项目文档](README.md)** - 详细的功能说明和使用指南

### 开发者
1. **[开发文档](DEVELOPMENT.md)** - 开发详情和架构说明
2. **[贡献指南](CONTRIBUTING.md)** - 如何参与项目开发

---

## 📚 核心文档

### 用户文档

| 文档 | 描述 | 适合人群 |
|------|------|----------|
| [README.md](README.md) | 完整的项目文档，包含功能说明、安装步骤、使用指南 | 所有用户 |
| [QUICKSTART.md](QUICKSTART.md) | 5分钟快速上手指南 | 新用户 |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | 详细的测试指南和测试清单 | 测试人员 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 常见问题和故障排除 | 遇到问题的用户 |

### 开发文档

| 文档 | 描述 | 适合人群 |
|------|------|----------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | 开发详情、架构说明、技术栈 | 开发者 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南、代码规范、提交规范 | 贡献者 |
| [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) | 优化总结、性能对比、技术亮点 | 开发者 |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | 项目完整总结、统计数据 | 项目管理者 |

### 项目管理

| 文档 | 描述 | 适合人群 |
|------|------|----------|
| [CHANGELOG.md](CHANGELOG.md) | 版本历史和更新日志 | 所有用户 |
| [TODO.md](../TODO.md) | 待办事项和开发计划 | 开发者 |
| [COMPLETION.md](COMPLETION.md) | 项目完成总结 | 项目管理者 |

---

## 🛠️ 工具和脚本

### 启动脚本

| 脚本 | 平台 | 用途 |
|------|------|------|
| [start.sh](start.sh) | Linux/Mac | 启动开发服务器 |
| [start.ps1](start.ps1) | Windows | 启动开发服务器 |

### 部署脚本

| 脚本 | 平台 | 用途 |
|------|------|------|
| [deploy.sh](deploy.sh) | Linux/Mac | 快速构建和部署 |
| [deploy.ps1](deploy.ps1) | Windows | 快速构建和部署 |

### 监控脚本

| 脚本 | 平台 | 用途 |
|------|------|------|
| [monitor.sh](monitor.sh) | Linux/Mac | 性能监控 |
| [monitor.ps1](monitor.ps1) | Windows | 性能监控 |

---

## 📖 按场景查找文档

### 我想快速开始使用
→ [QUICKSTART.md](QUICKSTART.md)

### 我想了解所有功能
→ [README.md](README.md)

### 我遇到了问题
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### 我想参与开发
→ [CONTRIBUTING.md](CONTRIBUTING.md)

### 我想了解技术细节
→ [DEVELOPMENT.md](DEVELOPMENT.md)

### 我想了解优化内容
→ [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)

### 我想测试应用
→ [TESTING_GUIDE.md](TESTING_GUIDE.md)

### 我想查看更新历史
→ [CHANGELOG.md](CHANGELOG.md)

---

## 🎯 按角色查找文档

### 👤 普通用户
1. [QUICKSTART.md](QUICKSTART.md) - 快速开始
2. [README.md](README.md) - 完整文档
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除

### 👨‍💻 开发者
1. [DEVELOPMENT.md](DEVELOPMENT.md) - 开发文档
2. [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
3. [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - 优化总结

### 🧪 测试人员
1. [TESTING_GUIDE.md](TESTING_GUIDE.md) - 测试指南
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排除
3. [README.md](README.md) - 功能说明

### 📊 项目管理者
1. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - 项目总结
2. [CHANGELOG.md](CHANGELOG.md) - 更新日志
3. [TODO.md](../TODO.md) - 开发计划

---

## 📂 项目结构

```
mobile/
├── 📄 文档文件
│   ├── README.md                    # 完整项目文档
│   ├── QUICKSTART.md                # 快速开始指南
│   ├── DEVELOPMENT.md               # 开发文档
│   ├── TESTING_GUIDE.md             # 测试指南
│   ├── TROUBLESHOOTING.md           # 故障排除
│   ├── CONTRIBUTING.md              # 贡献指南
│   ├── OPTIMIZATION_SUMMARY.md      # 优化总结
│   ├── PROJECT_SUMMARY.md           # 项目总结
│   ├── CHANGELOG.md                 # 更新日志
│   ├── COMPLETION.md                # 完成总结
│   └── INDEX.md                     # 本文档
│
├── 🔧 工具脚本
│   ├── start.sh / start.ps1         # 启动脚本
│   ├── deploy.sh / deploy.ps1       # 部署脚本
│   └── monitor.sh / monitor.ps1     # 监控脚本
│
├── 📱 源代码
│   ├── src/
│   │   ├── screens/                 # 界面组件
│   │   ├── services/                # 服务层
│   │   ├── database/                # 数据库
│   │   └── utils/                   # 工具类
│   │
│   ├── android/                     # Android 原生代码
│   └── index.js                     # 入口文件
│
└── ⚙️ 配置文件
    ├── package.json                 # 依赖配置
    ├── .env.example                 # 环境配置示例
    └── ...
```

---

## 🔗 外部链接

### 项目相关
- **GitHub 仓库**: https://github.com/your-username/SecondBrain
- **问题反馈**: https://github.com/your-username/SecondBrain/issues
- **项目主页**: https://github.com/your-username/SecondBrain#readme

### 技术文档
- **React Native**: https://reactnative.dev/
- **React Navigation**: https://reactnavigation.org/
- **SQLite**: https://www.sqlite.org/

---

## 📊 文档统计

| 类别 | 文件数 | 总字数 |
|------|--------|--------|
| 用户文档 | 4 | ~8,000 字 |
| 开发文档 | 4 | ~12,000 字 |
| 项目管理 | 3 | ~5,000 字 |
| **总计** | **11** | **~25,000 字** |

---

## 🆕 最近更新

### v1.1.0 (2026-01-21)
- ✅ 添加性能监控系统
- ✅ 添加日志记录系统
- ✅ 优化剪贴板监听服务
- ✅ 完善通知交互功能
- ✅ 优化同步服务
- ✅ 增强用户界面
- ✅ 完善项目文档

详见 [CHANGELOG.md](CHANGELOG.md)

---

## 💡 推荐阅读顺序

### 新用户
1. [QUICKSTART.md](QUICKSTART.md) - 快速上手
2. [README.md](README.md) - 了解功能
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 解决问题

### 开发者
1. [README.md](README.md) - 了解项目
2. [DEVELOPMENT.md](DEVELOPMENT.md) - 开发环境
3. [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献规范
4. [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md) - 技术细节

### 测试人员
1. [README.md](README.md) - 了解功能
2. [TESTING_GUIDE.md](TESTING_GUIDE.md) - 测试方法
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 问题排查

---

## 🎯 快速命令

```bash
# 快速开始
cd mobile && npm install && npm run android

# 启动开发
./start.sh  # Linux/Mac
.\start.ps1  # Windows

# 快速部署
./deploy.sh  # Linux/Mac
.\deploy.ps1  # Windows

# 性能监控
./monitor.sh  # Linux/Mac
.\monitor.ps1  # Windows

# 查看日志
adb logcat | grep -i "clipboard\|sync\|api"

# 查看性能
performanceMonitor.printReport()

# 查看日志统计
logger.printStats()
```

---

## 📞 获取帮助

### 文档中找不到答案？
1. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. 搜索 [GitHub Issues](https://github.com/your-username/SecondBrain/issues)
3. 提交新的 Issue

### 想要贡献代码？
1. 阅读 [CONTRIBUTING.md](CONTRIBUTING.md)
2. Fork 项目
3. 提交 Pull Request

---

## 📝 文档维护

### 文档更新
- 所有文档都应保持最新
- 重大变更需要更新相关文档
- 提交代码时同步更新文档

### 文档规范
- 使用 Markdown 格式
- 保持清晰的结构
- 添加适当的示例
- 使用表情符号增强可读性

---

**最后更新**: 2026-01-21
**文档版本**: v1.1.0
**维护者**: Claude Code

---

**🎉 感谢使用外挂大脑！**

如有任何问题或建议，欢迎提交 Issue 或 Pull Request。
