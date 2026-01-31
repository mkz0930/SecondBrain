# 变更日志

本文档记录 Second Brain（外挂大脑）项目的所有重要变更。

## 格式说明

每个版本的变更记录包含以下部分：

- **Added（新增）**：新增的功能
- **Changed（变更）**：现有功能的变更
- **Fixed（修复）**：Bug 修复
- **Removed（移除）**：移除的功能
- **Security（安全）**：安全相关的修复

---

## [Unreleased]

### Added
- 待发布的新功能

### Changed
- 待发布的变更

### Fixed
- 待发布的修复

---

## [1.0.3] - 2026-01-23

### Changed
- 按 prules 规范整理项目文档结构
  - 相关文件：`docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`
  - 影响范围：项目文档

- 整理根目录，移除冗余文档
  - 移动到 docs/：`DEPLOYMENT.md`, `DOCKER-QUICK-REF.md`, `TESTING.md`
  - 删除重复文档：`PROJECT.md`, `ANDROID_COMPLETE.md`, `AUTOMATION_COMPLETE.md`
  - 删除临时文档：`FEISHU_FIX_SUMMARY.md`, `FEISHU_MULTISELECT_*.md`, `REFACTORING_*.md`
  - 保留核心文档：`README.md`, `CLAUDE.md`, `TODO.md`

- 重构项目目录结构
  - 新建 `docker/` 目录：存放 Dockerfile、docker-compose*.yml、nginx.conf.example
  - 新建 `scripts/deploy/` 目录：存放 deploy.sh、deploy-all.sh、deploy-all.ps1、docker-deploy.sh
  - 合并 `tests/` 到 `test/` 目录
  - 合并 `doc/` 到 `docs/` 目录
  - 移动测试脚本到 `scripts/`：test-feishu-fields.js、test-docker.ps1
  - 删除无用目录：`.qoder/`、`.trae/`、`__pycache__/`

---

## [1.0.2] - 2026-01-21

### Fixed
- 修复飞书同步"空记录"问题
  - 相关文件：`server/services/feishu-adapter.js`
  - 问题原因：飞书表格的内容字段名为"记录"，但代码中只查找 `['内容正文', '内容', '正文', 'Content', 'Body']`
  - 解决方案：在字段别名列表中添加 `'记录'` 字段
  - 修复效果：24条记录100%成功同步并完成AI分析

- 修复 ESLint 配置文件语法错误
  - 相关文件：`.eslintrc.cjs`
  - 问题原因：注释语法错误（`#` → `//`）
  - 解决方案：修正注释语法，关闭 `linebreak-style` 检查以兼容 Windows CRLF

### Added
- 新增数据库诊断工具 analyze-db.js
  - 相关文件：`scripts/analyze-db.js`
  - 影响范围：开发调试
  - 功能：查看最近记录详情、统计内容完整性、检查飞书同步映射

- 新增同步结果检查工具 check-sync-result.js
  - 相关文件：`scripts/check-sync-result.js`
  - 影响范围：开发调试
  - 功能：通过API获取内容列表、统计分析同步效果

- 新增清理工具 cleanup-empty-mappings.js
  - 相关文件：`scripts/cleanup-empty-mappings.js`
  - 影响范围：数据维护
  - 功能：删除空记录映射关系、清理误判的空内容记录

- 新增飞书字段修复报告文档
  - 相关文件：`docs/feishu-field-fix-report.md`
  - 影响范围：项目文档

---

## [1.0.1] - 2026-01-20

### Added
- 新增 Android 移动端应用
  - 相关文件：`mobile/` 目录
  - 影响范围：移动端功能
  - 功能文档：`mobile/README.md`, `mobile/QUICKSTART.md`, `mobile/DEVELOPMENT.md`

- 新增剪切板监听服务
  - 相关文件：`mobile/src/services/ClipboardService.js`
  - 影响范围：Android 端
  - 功能：后台持续监听剪切板变化、智能 URL 识别和过滤、可配置检查间隔

- 新增离线队列管理
  - 相关文件：`mobile/src/database/ClipboardQueue.js`
  - 影响范围：Android 端
  - 功能：SQLite 本地缓存、状态管理、指数退避重试机制

- 新增 Android API 集成
  - 相关文件：`mobile/src/services/ApiService.js`, `mobile/src/services/SyncService.js`
  - 影响范围：Android 端
  - 功能：用户认证、快速保存 API、批量保存 API、飞书同步触发

- 新增 Android 用户界面
  - 相关文件：`mobile/src/screens/HomeScreen.js`, `mobile/src/screens/ContentListScreen.js`, `mobile/src/screens/SettingsScreen.js`
  - 影响范围：Android 端
  - 功能：主页、内容列表、设置页面

- 新增 Android 完成报告文档
  - 相关文件：`docs/android-completion-report.md`
  - 影响范围：项目文档

---

## [1.0.0] - 2026-01-17

### Added
- 项目初始化，Web 端功能完成
  - 影响范围：全局

- 新增内容管理功能
  - 相关文件：`server/routes/contents.js`, `src/views/ContentView.vue`, `src/stores/content.js`
  - 影响范围：内容模块
  - 功能：支持随笔、文章、音视频、书籍等多种内容类型

- 新增 AI 内容分析功能
  - 相关文件：`server/services/ai-service.js`
  - 影响范围：AI 模块
  - 功能：自动提取标题、生成摘要、识别类型、推荐标签

- 新增标签管理功能
  - 相关文件：`server/routes/tags.js`, `src/stores/tag.js`
  - 影响范围：标签模块
  - 功能：创建标签、设置颜色、内容标签关联

- 新增飞书双向同步功能
  - 相关文件：`server/services/feishu-adapter.js`, `server/services/sync-service.js`, `server/services/sync-scheduler.js`
  - 影响范围：同步模块
  - 功能：双向同步、自动同步、增量同步、冲突解决

- 新增每日总结功能
  - 相关文件：`server/services/daily-summary-service.js`, `server/routes/daily-summary.js`
  - 影响范围：总结模块
  - 功能：AI 自动生成每日内容总结

- 新增研究助手功能
  - 相关文件：`server/services/research-service.js`, `server/routes/research.js`, `src/views/ResearchView.vue`
  - 影响范围：研究模块
  - 功能：对话式研究、需求分析、材料收集、知识图谱、报告生成

- 新增用户认证功能
  - 相关文件：`server/routes/auth.js`, `server/middleware/auth.js`, `src/stores/user.js`
  - 影响范围：认证模块
  - 功能：用户名密码登录、微信小程序登录、JWT Token 认证

### Changed
- 首页排序方式从"按创建时间倒序"更改为"按更新时间倒序"
  - 相关文件：`src/views/HomeView.vue`
  - 影响范围：首页展示

- 首页时间轴分组依据调整为内容的更新时间
  - 相关文件：`src/views/HomeView.vue`
  - 影响范围：首页展示

- 飞书同步过程中自动填充空内容
  - 相关文件：`server/services/sync-service.js`
  - 影响范围：同步模块
  - 功能：若记录包含URL且正文为空，自动抓取网页内容填充

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-23
