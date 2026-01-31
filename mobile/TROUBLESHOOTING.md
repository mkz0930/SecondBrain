# 故障排除指南

本文档提供常见问题的解决方案。

## 📋 目录

- [安装问题](#安装问题)
- [运行问题](#运行问题)
- [功能问题](#功能问题)
- [性能问题](#性能问题)
- [网络问题](#网络问题)
- [设备兼容性](#设备兼容性)

---

## 安装问题

### 问题 1: npm install 失败

**症状**:
```
npm ERR! code ECONNREFUSED
npm ERR! errno ECONNREFUSED
```

**解决方案**:
1. 检查网络连接
2. 尝试使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install
   ```
3. 清除 npm 缓存：
   ```bash
   npm cache clean --force
   npm install
   ```

### 问题 2: Android SDK 未找到

**症状**:
```
ANDROID_HOME is not set
```

**解决方案**:
1. 安装 Android Studio
2. 设置环境变量：
   ```bash
   # Linux/Mac
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools

   # Windows (PowerShell)
   $env:ANDROID_HOME = "C:\Users\YourName\AppData\Local\Android\Sdk"
   $env:PATH += ";$env:ANDROID_HOME\platform-tools"
   ```

### 问题 3: Gradle 构建失败

**症状**:
```
Could not resolve all dependencies
```

**解决方案**:
1. 清理 Gradle 缓存：
   ```bash
   cd android
   ./gradlew clean
   ```
2. 删除 `.gradle` 文件夹：
   ```bash
   rm -rf android/.gradle
   ```
3. 重新构建：
   ```bash
   ./gradlew assembleDebug
   ```

---

## 运行问题

### 问题 1: Metro 启动失败

**症状**:
```
Error: listen EADDRINUSE: address already in use :::8081
```

**解决方案**:
1. 杀死占用端口的进程：
   ```bash
   # Linux/Mac
   lsof -ti:8081 | xargs kill -9

   # Windows
   netstat -ano | findstr :8081
   taskkill /PID <PID> /F
   ```
2. 重新启动 Metro：
   ```bash
   npm start
   ```

### 问题 2: 应用无法安装

**症状**:
```
INSTALL_FAILED_UPDATE_INCOMPATIBLE
```

**解决方案**:
1. 卸载旧版本：
   ```bash
   adb uninstall com.secondbrain
   ```
2. 重新安装：
   ```bash
   npm run android
   ```

### 问题 3: 应用闪退

**症状**: 应用启动后立即崩溃

**解决方案**:
1. 查看崩溃日志：
   ```bash
   adb logcat | grep -i "crash\|error\|exception"
   ```
2. 清除应用数据：
   ```bash
   adb shell pm clear com.secondbrain
   ```
3. 重新安装应用

---

## 功能问题

### 问题 1: 剪贴板监听不工作

**症状**: 复制链接后没有通知

**可能原因**:
1. 监听开关未打开
2. 通知权限未授予
3. 应用被系统杀死
4. 电池优化限制

**解决方案**:

#### 1. 检查监听开关
- 打开应用
- 进入主页
- 确认"剪贴板监听"开关已打开

#### 2. 检查通知权限
```bash
# 检查权限
adb shell dumpsys package com.secondbrain | grep -i "notification"

# 授予权限
adb shell pm grant com.secondbrain android.permission.POST_NOTIFICATIONS
```

#### 3. 检查后台运行权限
- 进入系统设置
- 找到"外挂大脑"应用
- 允许后台运行
- 关闭电池优化

#### 4. 厂商特定设置

**小米 (MIUI)**:
1. 设置 → 应用设置 → 应用管理 → 外挂大脑
2. 省电策略 → 无限制
3. 自启动 → 允许
4. 后台弹出界面 → 允许

**华为 (EMUI)**:
1. 设置 → 应用 → 应用启动管理 → 外挂大脑
2. 手动管理 → 全部允许

**OPPO (ColorOS)**:
1. 设置 → 电池 → 应用耗电管理 → 外挂大脑
2. 允许后台运行

**Vivo (FuntouchOS)**:
1. 设置 → 电池 → 后台高耗电 → 外挂大脑
2. 允许后台高耗电

### 问题 2: 通知按钮无响应

**症状**: 点击"保存"或"忽略"按钮没有反应

**解决方案**:
1. 检查应用版本（需要 v1.1.0+）
2. 重启应用
3. 查看日志：
   ```bash
   adb logcat | grep -i "notification"
   ```

### 问题 3: 同步失败

**症状**: 内容一直显示"待同步"

**可能原因**:
1. 网络连接问题
2. 后端服务未运行
3. 服务器地址错误
4. 认证失败

**解决方案**:

#### 1. 检查网络连接
```bash
# 测试网络
adb shell ping -c 4 8.8.8.8
```

#### 2. 检查后端服务
```bash
# 确保后端运行在 http://localhost:3000
curl http://localhost:3000/api/health
```

#### 3. 检查服务器地址
- 打开应用设置
- 确认服务器地址正确
- 模拟器使用：`http://10.0.2.2:3000`
- 真机使用：`http://192.168.x.x:3000`

#### 4. 检查登录状态
- 重新登录
- 查看错误日志

### 问题 4: URL 未被检测

**症状**: 复制链接后没有任何反应

**可能原因**:
1. URL 不在白名单中
2. URL 在黑名单中
3. URL 格式不正确

**解决方案**:
1. 检查 URL 格式（必须以 http:// 或 https:// 开头）
2. 查看 URL 验证日志：
   ```bash
   adb logcat | grep -i "urlvalidator"
   ```
3. 测试支持的 URL：
   - 微信公众号：`https://mp.weixin.qq.com/s/xxxxx`
   - 知乎文章：`https://zhihu.com/p/xxxxx`
   - 掘金：`https://juejin.cn/post/xxxxx`

---

## 性能问题

### 问题 1: 电量消耗过高

**症状**: 应用耗电明显

**解决方案**:
1. 调整检查间隔：
   - 进入设置
   - 增加检查间隔（推荐 3-5 秒）
2. 查看性能监控：
   ```javascript
   performanceMonitor.printReport()
   ```
3. 检查是否有异常循环

### 问题 2: 内存占用过高

**症状**: 应用占用内存超过 100MB

**解决方案**:
1. 查看内存使用：
   ```bash
   adb shell dumpsys meminfo com.secondbrain
   ```
2. 清理已同步项目：
   - 打开应用
   - 进入设置
   - 清理历史数据
3. 重启应用

### 问题 3: 应用响应慢

**症状**: 界面操作卡顿

**解决方案**:
1. 清理应用缓存：
   ```bash
   adb shell pm clear com.secondbrain
   ```
2. 检查同步队列大小
3. 减少自动刷新频率

---

## 网络问题

### 问题 1: 无法连接服务器

**症状**:
```
Network request failed
```

**解决方案**:

#### 模拟器
1. 确认后端运行：
   ```bash
   curl http://localhost:3000/api/health
   ```
2. 使用正确的地址：`http://10.0.2.2:3000`

#### 真机
1. 确保手机和电脑在同一局域网
2. 查找电脑 IP：
   ```bash
   # Linux/Mac
   ifconfig | grep "inet "

   # Windows
   ipconfig | findstr IPv4
   ```
3. 使用电脑 IP：`http://192.168.x.x:3000`

### 问题 2: 请求超时

**症状**:
```
Request timeout
```

**解决方案**:
1. 检查网络速度
2. 增加超时时间（在 ApiService.js 中）
3. 使用更快的网络

### 问题 3: SSL 证书错误

**症状**:
```
SSL certificate error
```

**解决方案**:
1. 使用 HTTP 而不是 HTTPS（开发环境）
2. 安装正确的 SSL 证书（生产环境）

---

## 设备兼容性

### Android 10+ 剪贴板限制

**问题**: Android 10+ 只能在前台读取剪贴板

**解决方案**:
- 使用前台服务（已实现）
- 确保应用在后台时显示通知

### 厂商系统限制

**小米 MIUI**:
- 问题：后台应用容易被杀死
- 解决：加入电池优化白名单

**华为 EMUI**:
- 问题：严格的后台限制
- 解决：允许应用自启动和后台运行

**OPPO ColorOS**:
- 问题：后台冻结
- 解决：允许后台高耗电

---

## 调试技巧

### 查看完整日志

```bash
# 所有日志
adb logcat

# 过滤应用日志
adb logcat | grep -i "secondbrain"

# 过滤特定标签
adb logcat | grep -i "clipboard\|sync\|api"

# 保存日志到文件
adb logcat > app.log
```

### 查看数据库

```bash
# 进入应用目录
adb shell
run-as com.secondbrain
cd databases

# 查看数据库
sqlite3 clipboard_queue.db

# 查看表
.tables

# 查看数据
SELECT * FROM clipboard_queue;

# 退出
.exit
exit
```

### 查看性能数据

```javascript
// 在 Chrome DevTools 控制台执行

// 性能报告
performanceMonitor.printReport()

// 性能指标
const metrics = performanceMonitor.getMetrics()
console.log(metrics)

// 最近错误
const errors = performanceMonitor.getRecentErrors(10)
console.log(errors)
```

### 查看日志

```javascript
// 日志统计
logger.printStats()

// 错误日志
const errors = logger.getErrors(20)
console.log(errors)

// 导出日志
const logText = logger.exportLogs()
console.log(logText)
```

---

## 获取帮助

如果以上方法都无法解决问题：

1. **查看文档**
   - [README.md](README.md)
   - [TESTING_GUIDE.md](TESTING_GUIDE.md)
   - [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)

2. **搜索 Issues**
   - 在 GitHub 上搜索类似问题

3. **提交 Issue**
   - 提供详细的错误信息
   - 包含设备信息和日志
   - 描述复现步骤

4. **联系维护者**
   - 通过 GitHub Issues 联系

---

## 常用命令速查

```bash
# 设备管理
adb devices                          # 列出设备
adb shell                            # 进入设备 shell

# 应用管理
adb install -r app.apk               # 安装应用
adb uninstall com.secondbrain        # 卸载应用
adb shell pm clear com.secondbrain   # 清除数据

# 日志查看
adb logcat                           # 查看日志
adb logcat -c                        # 清除日志
adb logcat > log.txt                 # 保存日志

# 文件操作
adb push local remote                # 上传文件
adb pull remote local                # 下载文件

# 应用操作
adb shell am start -n com.secondbrain/.MainActivity  # 启动应用
adb shell am force-stop com.secondbrain              # 停止应用

# 性能监控
adb shell dumpsys meminfo com.secondbrain            # 内存信息
adb shell dumpsys battery                            # 电池信息
adb shell top -n 1 | grep secondbrain                # CPU 使用
```

---

**最后更新**: 2026-01-21

如有其他问题，请提交 Issue 或查看项目文档。
