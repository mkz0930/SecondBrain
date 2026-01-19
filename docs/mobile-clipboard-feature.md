# 移动端剪切板监听功能设计方案

## 1. 项目概述

为 Second Brain 开发移动端应用，实现剪切板自动监听功能，让用户可以方便地收藏文章并同步到云端。

### 核心功能
- 后台自动监听剪切板变化
- 检测到 URL 时弹出通知询问是否保存
- 即时调用 AI 分析内容并同步到云端
- 与现有 Web 端数据完全同步

### 技术选型
- **移动端框架**: React Native (跨平台，社区成熟，剪切板监听支持完善)
- **监听方式**: 后台自动监听 (用户体验最佳)
- **同步策略**: 即时 AI 分析 + 同步 (实时性最好)

## 2. 技术架构

### 2.1 移动端架构

```
React Native App
├── src/
│   ├── services/
│   │   ├── ClipboardService.js      # 剪切板监听服务
│   │   ├── BackgroundService.js     # 后台任务管理
│   │   ├── ApiService.js            # API 调用封装
│   │   └── AuthService.js           # 认证服务
│   ├── screens/
│   │   ├── HomeScreen.js            # 主页
│   │   ├── ContentListScreen.js     # 内容列表
│   │   ├── ContentDetailScreen.js   # 内容详情
│   │   └── SettingsScreen.js        # 设置页面
│   ├── components/
│   │   ├── ClipboardNotification.js # 剪切板通知组件
│   │   └── ContentCard.js           # 内容卡片
│   └── store/
│       ├── contentStore.js          # 内容状态管理
│       └── authStore.js             # 认证状态管理
```

### 2.2 核心依赖库

```json
{
  "dependencies": {
    "react-native": "^0.73.0",
    "@react-native-clipboard/clipboard": "^1.13.2",
    "react-native-background-actions": "^3.0.0",
    "react-native-push-notification": "^8.1.1",
    "@react-navigation/native": "^6.1.9",
    "axios": "^1.6.0",
    "zustand": "^4.4.7"
  }
}
```

### 2.3 关键技术点

#### 剪切板监听实现

```javascript
// services/ClipboardService.js
import Clipboard from '@react-native-clipboard/clipboard';
import BackgroundService from 'react-native-background-actions';

class ClipboardMonitor {
  constructor() {
    this.lastContent = '';
    this.checkInterval = 2000; // 每2秒检查一次
  }

  async start() {
    const task = async (taskData) => {
      await new Promise(async (resolve) => {
        while (BackgroundService.isRunning()) {
          const content = await Clipboard.getString();

          if (content !== this.lastContent && this.isURL(content)) {
            this.lastContent = content;
            await this.handleNewURL(content);
          }

          await this.sleep(this.checkInterval);
        }
      });
    };

    await BackgroundService.start(task, {
      taskName: 'ClipboardMonitor',
      taskTitle: 'Second Brain 剪切板监听',
      taskDesc: '正在监听剪切板中的链接',
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    });
  }

  isURL(text) {
    const urlRegex = /^https?:\/\/.+/i;
    return urlRegex.test(text.trim());
  }

  async handleNewURL(url) {
    // 发送本地通知询问用户
    await this.showNotification(url);
  }

  async showNotification(url) {
    PushNotification.localNotification({
      title: '发现新链接',
      message: '是否保存到 Second Brain？',
      userInfo: { url },
      actions: ['保存', '忽略'],
    });
  }
}
```

#### 后台任务权限配置

**Android (android/app/src/main/AndroidManifest.xml)**:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**iOS (ios/SecondBrain/Info.plist)**:
```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>processing</string>
</array>
```

## 3. API 集成方案

### 3.1 认证机制

移动端使用与 Web 端相同的 token 认证机制：

```javascript
// services/AuthService.js
class AuthService {
  async login(username, password) {
    const response = await axios.post('/api/auth/login', {
      username,
      password
    });

    const { token, user } = response.data;
    await AsyncStorage.setItem('auth_token', token);
    return user;
  }

  async getToken() {
    return await AsyncStorage.getItem('auth_token');
  }

  async logout() {
    await AsyncStorage.removeItem('auth_token');
  }
}
```

### 3.2 内容同步 API

复用现有的 `/api/contents` 接口：

```javascript
// services/ApiService.js
class ApiService {
  constructor() {
    this.baseURL = 'http://your-server.com'; // 配置服务器地址
  }

  async createContent(url) {
    const token = await AuthService.getToken();

    // 调用现有的 POST /api/contents 接口
    // 后端会自动触发 AI 分析
    const response = await axios.post(
      `${this.baseURL}/api/contents`,
      {
        content: url,
        type: '其他', // 让 AI 自动识别
        title: 'New Note' // 触发 AI 分析
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  }

  async getContents(params = {}) {
    const token = await AuthService.getToken();

    const response = await axios.get(
      `${this.baseURL}/api/contents`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  }
}
```

### 3.3 后端无需修改

现有后端 API 已完全支持移动端需求：

1. **认证**: `server/middleware/auth.js` 支持 Bearer token 和 `x-session-token` header
2. **AI 分析**: `POST /api/contents` 在检测到 URL 且标题不合理时自动触发 AI 分析
3. **内容管理**: 完整的 CRUD API 已就绪

## 4. 用户体验流程

### 4.1 首次使用流程

```
1. 用户安装 App
   ↓
2. 登录账号（或使用匿名模式）
   ↓
3. 授予通知权限
   ↓
4. 启动剪切板监听服务
   ↓
5. 显示"监听已启动"提示
```

### 4.2 日常使用流程

```
1. 用户在其他 App 复制文章链接
   ↓
2. Second Brain 检测到剪切板变化
   ↓
3. 弹出通知："发现新链接，是否保存？"
   ↓
4. 用户点击"保存"
   ↓
5. 显示"正在分析..."加载提示
   ↓
6. 调用后端 API，触发 AI 分析
   ↓
7. 保存成功，显示"已保存到 Second Brain"
   ↓
8. 用户可在 App 内查看完整内容
```

### 4.3 通知交互设计

```javascript
// 通知配置
{
  title: '发现新链接',
  message: url.substring(0, 50) + '...',
  actions: [
    {
      id: 'save',
      title: '保存',
      foreground: true
    },
    {
      id: 'ignore',
      title: '忽略',
      foreground: false
    }
  ]
}
```

## 5. 性能与电量优化

### 5.1 监听频率控制

- 默认每 2 秒检查一次剪切板
- 用户可在设置中调整（1-5 秒）
- 检测到 URL 后延长下次检查间隔（避免重复）

### 5.2 网络优化

- 仅在 WiFi 下自动同步（可配置）
- 失败时本地缓存，稍后重试
- 支持批量同步模式

### 5.3 电量管理

- 使用前台服务保持监听
- 显示持久通知告知用户服务运行中
- 提供"暂停监听"快捷操作

## 6. 隐私与安全

### 6.1 隐私保护

- 仅监听 URL 格式内容
- 不上传非 URL 内容
- 本地日志不记录剪切板内容
- 用户可随时关闭监听

### 6.2 数据安全

- 使用 HTTPS 通信
- Token 存储在加密存储中（iOS Keychain / Android Keystore）
- 支持生物识别解锁

### 6.3 权限说明

```javascript
// 权限请求时的说明文案
const PERMISSION_MESSAGES = {
  notification: '需要通知权限来提醒您保存发现的链接',
  background: '需要后台运行权限来持续监听剪切板',
  network: '需要网络权限来同步内容到云端'
};
```

## 7. 开发计划

### Phase 1: 基础功能 (2-3 周)
- [ ] React Native 项目初始化
- [ ] 剪切板监听服务实现
- [ ] 后台任务配置（iOS + Android）
- [ ] 基础 UI 框架搭建
- [ ] API 集成和认证

### Phase 2: 核心功能 (2-3 周)
- [ ] 通知交互实现
- [ ] 内容列表和详情页
- [ ] 离线缓存机制
- [ ] 设置页面（监听开关、频率调整）
- [ ] 错误处理和重试逻辑

### Phase 3: 优化与测试 (1-2 周)
- [ ] 性能优化（电量、网络）
- [ ] UI/UX 优化
- [ ] 真机测试（多种设备）
- [ ] 权限流程优化
- [ ] 文档和用户指南

### Phase 4: 发布准备 (1 周)
- [ ] App 图标和启动页
- [ ] 应用商店资料准备
- [ ] 隐私政策和用户协议
- [ ] Beta 测试
- [ ] 正式发布

## 8. 技术风险与应对

### 8.1 iOS 后台限制

**风险**: iOS 对后台任务限制严格，可能无法持续监听

**应对方案**:
1. 使用 Background Fetch（系统调度，不保证实时性）
2. 结合 Share Extension（用户主动分享）
3. 提供"打开 App 时检测"作为备选方案

### 8.2 Android 电池优化

**风险**: 部分厂商的电池优化会杀死后台服务

**应对方案**:
1. 引导用户将 App 加入白名单
2. 使用前台服务提高存活率
3. 提供重启服务的快捷方式

### 8.3 剪切板隐私政策

**风险**: iOS 14+ 会在读取剪切板时显示提示

**应对方案**:
1. 在首次使用时明确说明用途
2. 提供"仅在 App 内检测"选项
3. 考虑使用 Share Extension 作为主要方式

## 9. 替代方案：Share Extension

如果后台监听遇到技术或政策限制，可以使用系统分享功能：

### 优势
- 不需要后台权限
- 隐私友好
- 系统原生支持

### 实现方式
```javascript
// iOS Share Extension
// 用户在其他 App 点击"分享" → 选择 Second Brain
// 直接调用 API 保存内容
```

### 用户流程
```
1. 在浏览器/App 中打开文章
   ↓
2. 点击"分享"按钮
   ↓
3. 选择"Second Brain"
   ↓
4. 自动保存并分析
```

## 10. 配置文件示例

### 环境配置 (.env)
```
API_BASE_URL=https://your-server.com
CLIPBOARD_CHECK_INTERVAL=2000
ENABLE_BACKGROUND_SYNC=true
WIFI_ONLY_SYNC=false
```

### 用户设置
```javascript
const DEFAULT_SETTINGS = {
  clipboardMonitoring: true,
  checkInterval: 2000,
  wifiOnlySync: false,
  notificationEnabled: true,
  autoSave: false, // 是否跳过确认直接保存
  biometricLock: false
};
```

## 11. 总结

本方案基于 React Native 实现跨平台移动端应用，核心功能是后台监听剪切板并自动保存文章链接。通过复用现有后端 API，无需修改服务器代码即可实现完整功能。

**关键优势**:
- 无缝集成现有系统
- 用户体验流畅
- 跨平台支持
- 隐私安全可控

**下一步行动**:
1. 创建 React Native 项目
2. 实现剪切板监听 POC
3. 测试后台服务在不同设备上的表现
4. 根据测试结果调整方案
