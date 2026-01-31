# Second Brain Android App

外挂大脑 Android 客户端 - 智能剪切板监听和飞书同步

## 功能特性

### 核心功能
- ✅ **后台剪切板监听** - 无感检测剪切板中的文章链接
- ✅ **智能 URL 识别** - 自动过滤非文章链接（图片、视频、电商等）
- ✅ **AI 内容分析** - 自动提取标题、摘要、标签
- ✅ **飞书多维表格同步** - 自动同步到飞书，与 Web 端数据互通
- ✅ **离线队列管理** - 无网络时本地缓存，恢复后自动同步
- ✅ **前台服务** - 持久运行，不被系统杀死

### 技术特点
- React Native 0.73 跨平台框架
- SQLite 本地数据库
- 指数退避重试机制
- 网络状态监听
- 通知交互

## 项目结构

```
mobile/
├── android/                    # Android 原生代码
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # 权限和服务配置
│   │   │   └── ...
│   │   └── build.gradle        # App 构建配置
│   ├── build.gradle            # 项目构建配置
│   ├── settings.gradle         # 项目设置
│   └── gradle.properties       # Gradle 属性
├── src/
│   ├── App.js                  # 主应用组件
│   ├── screens/                # 页面组件
│   │   ├── HomeScreen.js       # 主页（监听开关、统计）
│   │   ├── ContentListScreen.js # 内容列表
│   │   ├── ContentDetailScreen.js # 内容详情和编辑
│   │   ├── SearchScreen.js     # 搜索页面
│   │   ├── TagManagementScreen.js # 标签管理
│   │   ├── OfflineReadingScreen.js # 离线阅读
│   │   ├── BatchImportScreen.js # 批量导入
│   │   ├── UrlFilterScreen.js  # URL 过滤规则
│   │   ├── StatisticsScreen.js # 统计分析
│   │   └── SettingsScreen.js   # 设置页面
│   ├── services/               # 服务层
│   │   ├── ClipboardService.js # 剪切板监听服务
│   │   ├── ApiService.js       # API 调用服务
│   │   ├── SyncService.js      # 同步服务
│   │   └── NotificationService.js # 通知服务
│   ├── database/               # 数据库
│   │   ├── ClipboardQueue.js   # 离线队列管理
│   │   └── OfflineCache.js     # 离线内容缓存
│   └── utils/                  # 工具函数
│       ├── urlValidator.js     # URL 验证和过滤
│       ├── helpers.js          # 通用辅助函数
│       ├── Logger.js           # 日志工具
│       └── PerformanceMonitor.js # 性能监控
├── index.js                    # 入口文件
├── package.json                # 依赖配置
├── babel.config.js             # Babel 配置
└── metro.config.js             # Metro 打包配置
```

## 安装和运行

### 前置要求

1. **Node.js** >= 18
2. **Android Studio** (包含 Android SDK)
3. **JDK** 17
4. **React Native CLI**

```bash
npm install -g react-native-cli
```

### 安装依赖

```bash
cd mobile
npm install
```

### 运行开发版本

1. 启动 Metro 打包服务器：
```bash
npm start
```

2. 在另一个终端运行 Android 应用：
```bash
npm run android
```

或者使用 React Native CLI：
```bash
react-native run-android
```

### 连接后端服务器

#### 开发环境（Android 模拟器）

默认配置已设置为 `http://10.0.2.2:3000`（模拟器访问本机）

确保后端服务器在本机运行：
```bash
cd ..  # 回到项目根目录
npm run server
```

#### 开发环境（真机）

1. 确保手机和电脑在同一局域网
2. 在设置页面修改服务器地址为电脑的局域网 IP：
   ```
   http://192.168.x.x:3000
   ```

#### 生产环境

修改 `src/services/ApiService.js` 中的 `API_BASE_URL`：
```javascript
const API_BASE_URL = 'https://your-production-server.com';
```

## 使用说明

### 首次使用

1. **登录账号**
   - 打开应用，进入"设置"页面
   - 输入用户名和密码
   - 点击"登录"

2. **启动监听**
   - 返回主页
   - 打开"剪切板监听"开关
   - 授予通知权限（如果系统提示）

3. **开始使用**
   - 在其他应用（浏览器、微信等）复制文章链接
   - 收到通知后点击"保存"
   - 内容自动同步到飞书多维表格

### 日常使用

1. **自动保存**
   - 复制链接 → 收到通知 → 点击保存 → 自动同步

2. **查看内容**
   - 主页点击"查看内容列表"
   - 下拉刷新获取最新内容

3. **手动同步**
   - 主页点击"立即同步"
   - 强制同步所有待处理内容

### 设置选项

- **检查间隔**：剪切板检查频率（1-10秒）
  - 推荐：2-5秒
  - 过短会增加电量消耗

- **自动同步**：是否自动同步到飞书
  - 开启：实时同步
  - 关闭：仅本地保存

## 权限说明

应用需要以下权限：

| 权限 | 用途 | 必需性 |
|------|------|--------|
| INTERNET | 网络请求（API 调用） | 必需 |
| FOREGROUND_SERVICE | 后台服务（剪切板监听） | 必需 |
| WAKE_LOCK | 保持 CPU 唤醒 | 必需 |
| POST_NOTIFICATIONS | 显示通知 | 必需 |
| ACCESS_NETWORK_STATE | 检测网络状态 | 必需 |
| FOREGROUND_SERVICE_DATA_SYNC | 数据同步服务 | 必需 |

## 电池优化

为确保后台监听正常工作，需要将应用加入电池优化白名单：

### 小米 MIUI
1. 设置 → 应用设置 → 应用管理 → 外挂大脑
2. 省电策略 → 无限制
3. 自启动 → 允许

### 华为 EMUI
1. 设置 → 应用 → 应用启动管理 → 外挂大脑
2. 手动管理 → 全部允许

### OPPO ColorOS
1. 设置 → 电池 → 应用耗电管理 → 外挂大脑
2. 允许后台运行

### Vivo FuntouchOS
1. 设置 → 电池 → 后台高耗电 → 外挂大脑
2. 允许后台高耗电

## 故障排除

### 1. 监听不工作

**症状**：复制链接后没有通知

**解决方案**：
- 检查监听开关是否打开
- 检查通知权限是否授予
- 检查应用是否被加入电池优化白名单
- 重启应用

### 2. 同步失败

**症状**：内容保存失败或一直显示"待同步"

**解决方案**：
- 检查网络连接
- 检查服务器地址是否正确
- 检查是否已登录
- 查看错误信息（主页统计中的"失败"数量）
- 点击"立即同步"重试

### 3. 无法登录

**症状**：提示"登录失败"

**解决方案**：
- 检查服务器地址是否正确
- 检查用户名和密码是否正确
- 检查后端服务器是否运行
- 检查网络连接

### 4. 应用被杀死

**症状**：锁屏后监听停止

**解决方案**：
- 将应用加入电池优化白名单（见上文）
- 允许应用自启动
- 允许应用后台运行

## 开发指南

### 调试

1. **查看日志**
```bash
adb logcat | grep -i "clipboard\|sync\|api"
```

2. **查看数据库**
```bash
adb shell
run-as com.secondbrain
cd databases
sqlite3 clipboard_queue.db
.tables
SELECT * FROM clipboard_queue;
```

3. **清除数据**
```bash
adb shell pm clear com.secondbrain
```

### 构建 Release 版本

1. **生成签名密钥**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. **配置签名**

编辑 `android/gradle.properties`：
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

3. **构建 APK**
```bash
cd android
./gradlew assembleRelease
```

生成的 APK 位于：
```
android/app/build/outputs/apk/release/app-release.apk
```

## 性能优化

### 电量消耗
- 默认 2 秒检查间隔
- 仅在剪切板变化时处理
- 使用前台服务保持运行
- 预计电量消耗：< 5% / 小时

### 内存占用
- 使用 SQLite 本地存储
- 及时清理已同步项目
- 预计内存占用：< 100MB

### 网络优化
- 批量同步减少请求
- 失败自动重试（指数退避）
- 网络恢复自动同步

## 与后端集成

### API 端点

应用使用以下后端 API：

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/contents/fetch-url` - 获取 URL 内容
- `POST /api/contents/quick-save` - 快速保存（推荐）
- `POST /api/contents/batch` - 批量保存
- `GET /api/contents` - 获取内容列表
- `GET /api/feishu/config` - 获取飞书配置
- `POST /api/feishu/sync` - 触发飞书同步

### 认证机制

使用 Bearer Token 认证：
```
Authorization: Bearer <token>
x-session-token: <token>
```

## 飞书同步

### 工作流程

1. **剪切板检测** → 保存到本地队列
2. **本地队列** → 调用 `/api/contents/quick-save`
3. **后端处理** → AI 分析 + 保存到数据库
4. **飞书同步** → 后端自动同步到飞书多维表格

### 同步策略

- **实时同步**：每 5 分钟自动同步
- **网络恢复同步**：网络恢复时立即同步
- **手动同步**：用户点击"立即同步"
- **重试机制**：失败后指数退避重试（1s, 5s, 15s, 60s）

## 已知限制

1. **iOS 不支持**：当前仅支持 Android
2. **后台限制**：部分厂商可能限制后台运行
3. **剪切板权限**：Android 10+ 需要前台运行才能读取剪切板
4. **网络依赖**：需要网络连接才能同步

## 未来计划

- [ ] iOS 版本（使用 Share Extension）

## 已完成功能

- [x] 内容预览和编辑
- [x] 标签管理
- [x] 搜索功能
- [x] 离线阅读
- [x] 批量导入
- [x] 自定义 URL 白名单/黑名单
- [x] 统计和分析

## 技术栈

- **框架**：React Native 0.73
- **导航**：React Navigation 6
- **状态管理**：Zustand 4
- **数据库**：SQLite (react-native-sqlite-storage)
- **网络**：Axios
- **后台服务**：react-native-background-actions
- **通知**：react-native-push-notification
- **剪切板**：@react-native-clipboard/clipboard

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系开发团队。
