# 贡献指南

感谢你考虑为外挂大脑移动端项目做出贡献！

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)

---

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 挑衅、侮辱或贬损的评论
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

---

## 如何贡献

### 报告 Bug

在提交 Bug 报告之前：

1. **检查现有 Issues** - 确保问题尚未被报告
2. **使用最新版本** - 确认问题在最新版本中仍然存在
3. **收集信息** - 准备详细的复现步骤和环境信息

提交 Bug 报告时，请包含：

- **清晰的标题** - 简洁描述问题
- **详细描述** - 问题的详细说明
- **复现步骤** - 如何重现问题
- **预期行为** - 你期望发生什么
- **实际行为** - 实际发生了什么
- **环境信息** - 设备型号、Android 版本、应用版本
- **截图/日志** - 如果可能，提供截图或日志

**Bug 报告模板**:

```markdown
## Bug 描述
简洁清晰地描述 bug

## 复现步骤
1. 打开应用
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
清晰描述你期望发生什么

## 实际行为
清晰描述实际发生了什么

## 环境信息
- 设备型号: [例如 Xiaomi 13]
- Android 版本: [例如 Android 13]
- 应用版本: [例如 v1.1.0]

## 截图
如果可能，添加截图帮助解释问题

## 日志
如果可能，添加相关日志
```

### 建议新功能

在提交功能建议之前：

1. **检查现有 Issues** - 确保功能尚未被建议
2. **考虑范围** - 确保功能符合项目目标
3. **准备说明** - 清晰描述功能和使用场景

提交功能建议时，请包含：

- **清晰的标题** - 简洁描述功能
- **详细描述** - 功能的详细说明
- **使用场景** - 为什么需要这个功能
- **可能的实现** - 如果有想法，描述如何实现
- **替代方案** - 考虑过的其他方案

**功能建议模板**:

```markdown
## 功能描述
清晰简洁地描述你想要的功能

## 使用场景
描述这个功能解决什么问题

## 详细说明
详细描述功能应该如何工作

## 可能的实现
如果有想法，描述如何实现

## 替代方案
描述你考虑过的其他解决方案

## 额外信息
添加任何其他相关信息
```

### 提交代码

1. **Fork 项目** - 在 GitHub 上 fork 项目
2. **创建分支** - 从 `main` 创建功能分支
3. **编写代码** - 遵循代码规范
4. **编写测试** - 确保代码有测试覆盖
5. **提交代码** - 遵循提交规范
6. **推送分支** - 推送到你的 fork
7. **创建 PR** - 提交 Pull Request

---

## 开发流程

### 1. 设置开发环境

```bash
# 克隆项目
git clone https://github.com/your-username/SecondBrain.git
cd SecondBrain/mobile

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env

# 启动开发服务器
npm start
```

### 2. 创建功能分支

```bash
# 从 main 创建新分支
git checkout -b feature/your-feature-name

# 或修复 bug
git checkout -b fix/your-bug-fix
```

### 3. 开发和测试

```bash
# 运行应用
npm run android

# 运行测试（如果有）
npm test

# 检查代码规范
npm run lint
```

### 4. 提交代码

```bash
# 添加修改的文件
git add .

# 提交（遵循提交规范）
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/your-feature-name
```

### 5. 创建 Pull Request

1. 在 GitHub 上打开你的 fork
2. 点击 "New Pull Request"
3. 选择你的分支
4. 填写 PR 描述
5. 提交 PR

---

## 代码规范

### JavaScript/React Native

遵循 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

**关键规则**:

1. **命名规范**
   ```javascript
   // 组件: PascalCase
   class HomeScreen extends Component {}

   // 函数/变量: camelCase
   const getUserData = () => {}
   const userName = 'John'

   // 常量: UPPER_SNAKE_CASE
   const API_BASE_URL = 'http://...'
   ```

2. **文件命名**
   ```
   组件: PascalCase.js (HomeScreen.js)
   工具: camelCase.js (urlValidator.js)
   服务: camelCase.js (clipboardService.js)
   ```

3. **导入顺序**
   ```javascript
   // 1. React 相关
   import React from 'react';
   import {View, Text} from 'react-native';

   // 2. 第三方库
   import axios from 'axios';

   // 3. 本地模块
   import clipboardMonitor from './services/ClipboardService';
   import {isValidURL} from './utils/urlValidator';
   ```

4. **注释规范**
   ```javascript
   /**
    * 函数说明
    * @param {string} url - URL 地址
    * @returns {boolean} 是否有效
    */
   function isValidURL(url) {
     // 实现逻辑
   }
   ```

5. **日志规范**
   ```javascript
   // 使用 logger，不要使用 console.log
   import logger from './utils/Logger';

   logger.info('Service', 'Operation completed', {data});
   logger.error('Service', 'Operation failed', error);
   ```

### 性能监控

```javascript
// 记录性能指标
import performanceMonitor from './utils/PerformanceMonitor';

performanceMonitor.startTiming('operation');
// ... 执行操作
const duration = performanceMonitor.endTiming('operation');

// 记录错误
performanceMonitor.recordError(error, {context});
```

---

## 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 范围 (scope)

- `clipboard`: 剪贴板相关
- `sync`: 同步相关
- `ui`: 用户界面
- `api`: API 相关
- `perf`: 性能监控
- `log`: 日志系统
- `docs`: 文档

### 示例

```bash
# 新功能
git commit -m "feat(clipboard): add URL deduplication"

# Bug 修复
git commit -m "fix(sync): fix memory leak in retry mechanism"

# 文档更新
git commit -m "docs: update testing guide"

# 性能优化
git commit -m "perf(clipboard): implement adaptive check interval"
```

---

## 测试要求

### 手动测试

在提交 PR 之前，请确保：

- [ ] 应用可以正常启动
- [ ] 所有修改的功能都经过测试
- [ ] 没有引入新的 bug
- [ ] 在至少一个设备上测试过

### 测试清单

参考 [测试指南](TESTING_GUIDE.md) 进行完整测试：

- [ ] 功能测试
- [ ] 性能测试
- [ ] 兼容性测试
- [ ] 稳定性测试

---

## Pull Request 指南

### PR 标题

使用与提交信息相同的格式：

```
feat(clipboard): add URL deduplication
```

### PR 描述

使用以下模板：

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 性能优化
- [ ] 代码重构

## 变更说明
清晰描述你的变更

## 相关 Issue
Closes #123

## 测试
描述你如何测试这些变更

## 截图
如果适用，添加截图

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已进行自我代码审查
- [ ] 代码有适当的注释
- [ ] 文档已更新
- [ ] 变更不会产生新的警告
- [ ] 已添加测试
- [ ] 所有测试通过
```

### 代码审查

PR 提交后：

1. **等待审查** - 维护者会审查你的代码
2. **响应反馈** - 及时回复审查意见
3. **修改代码** - 根据反馈修改代码
4. **合并** - 审查通过后会被合并

---

## 开发技巧

### 调试

```bash
# 查看日志
adb logcat | grep -i "clipboard\|sync"

# 查看性能
performanceMonitor.printReport()

# 查看日志统计
logger.printStats()
```

### 性能分析

```javascript
// 使用性能监控
performanceMonitor.startTiming('operation');
// ... 操作
const duration = performanceMonitor.endTiming('operation');
console.log('耗时:', duration, 'ms');
```

### 常见问题

参考 [测试指南](TESTING_GUIDE.md#常见问题) 中的故障排除部分。

---

## 获取帮助

如果你需要帮助：

1. **查看文档** - 阅读项目文档
2. **搜索 Issues** - 查看是否有类似问题
3. **提问** - 在 Issues 中提问
4. **联系维护者** - 通过 GitHub 联系

---

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

---

**感谢你的贡献！** 🎉
