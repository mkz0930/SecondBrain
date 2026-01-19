# 附件功能实现文档

## 概述

为 Second Brain 添加了完整的附件上传和展示功能，支持图片、文档、音视频等多种文件类型。

## 功能特性

### 1. 文件上传
- **支持的文件类型**：
  - 图片：JPEG, PNG, GIF, WebP, SVG, BMP
  - 文档：PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX)
  - 文本：TXT, Markdown, CSV
  - 压缩文件：ZIP, RAR, 7Z
  - 音视频：MP3, WAV, OGG, MP4, AVI, MOV

- **文件大小限制**：单个文件最大 50MB
- **多文件上传**：支持一次选择多个文件上传
- **上传进度提示**：实时显示上传进度

### 2. 附件展示
- **图片预览**：自动显示图片缩略图
- **文件图标**：根据文件类型显示对应图标
- **文件信息**：显示文件名、大小等信息
- **下载链接**：点击附件可直接下载或在新标签页打开

### 3. 附件管理
- **添加附件**：在编辑页面上传文件
- **删除附件**：可以移除已上传的附件
- **附件列表**：在详情页面查看所有附件

## 技术实现

### 后端实现

#### 1. 文件上传 API (`server/routes/upload.js`)

```javascript
// 单文件上传
POST /api/upload/single
// 多文件上传
POST /api/upload/multiple
```

**技术栈**：
- `multer`：处理文件上传
- 文件存储：本地文件系统 (`uploads/` 目录)
- 文件命名：`时间戳-用户ID-原始文件名`

**安全措施**：
- 文件类型白名单验证
- 文件大小限制（50MB）
- 用户身份验证（requireUser 中间件）

#### 2. 数据库支持

`contents` 表已有 `attachments` 字段（TEXT 类型），存储 JSON 格式的附件信息：

```json
[
  {
    "name": "example.pdf",
    "filename": "1234567890-1-example.pdf",
    "url": "/uploads/1234567890-1-example.pdf",
    "type": "application/pdf",
    "size": 102400
  }
]
```

#### 3. 内容 API 更新 (`server/routes/contents.js`)

- `POST /api/contents`：创建内容时支持 `attachments` 字段
- `PUT /api/contents/:id`：更新内容时支持 `attachments` 字段

#### 4. 静态文件服务 (`server/index.js`)

```javascript
app.use('/uploads', express.static(join(__dirname, '../uploads')))
```

### 前端实现

#### 1. 编辑页面 (`src/views/ContentEditView.vue`)

**新增功能**：
- 文件选择按钮
- 附件列表显示
- 上传进度提示
- 删除附件功能

**关键函数**：
- `handleFileSelect()`：处理文件选择和上传
- `removeAttachment()`：删除附件
- `getAttachmentIcon()`：根据文件类型返回图标
- `formatFileSize()`：格式化文件大小显示

#### 2. 详情页面 (`src/views/ContentDetailView.vue`)

**已有功能**（无需修改）：
- 从数据库读取附件信息（`feishuAttachments` computed）
- 显示附件列表和图片预览
- 支持点击下载

**附件来源**：
1. **数据库附件**：从 `attachments` 字段读取（Feishu 同步或手动上传）
2. **内容提取附件**：从 Markdown/HTML 内容中提取的图片和文件链接

## 文件结构

```
SecondBrain/
├── server/
│   ├── routes/
│   │   ├── upload.js          # 新增：文件上传路由
│   │   └── contents.js         # 更新：支持 attachments 字段
│   └── index.js                # 更新：添加静态文件服务和上传路由
├── src/
│   └── views/
│       ├── ContentEditView.vue # 更新：添加文件上传功能
│       └── ContentDetailView.vue # 已有附件展示功能
├── uploads/                    # 新增：文件上传目录
│   └── README.md
├── .gitignore                  # 更新：忽略 uploads/ 目录
└── package.json                # 更新：添加 multer 依赖

```

## 使用方法

### 1. 上传附件

1. 进入内容编辑页面（新建或编辑）
2. 找到"附件"部分
3. 点击"📎 选择文件"按钮
4. 选择一个或多个文件
5. 等待上传完成
6. 保存内容

### 2. 查看附件

1. 进入内容详情页面
2. 在左侧信息栏查看"附件"卡片
3. 图片附件会自动显示预览
4. 点击附件名称可下载或打开文件

### 3. 删除附件

1. 在编辑页面的附件列表中
2. 点击附件右侧的"×"按钮
3. 保存内容以确认删除

## 部署注意事项

### 1. 文件存储

**开发环境**：
- 文件存储在 `uploads/` 目录
- 通过 Express 静态文件服务访问

**生产环境建议**：
- 使用对象存储服务（如阿里云 OSS、AWS S3）
- 配置 CDN 加速
- 修改 `server/routes/upload.js` 中的存储配置

### 2. 权限配置

确保 `uploads/` 目录有写入权限：

```bash
mkdir -p uploads
chmod 755 uploads
```

### 3. Nginx 配置（如果使用）

```nginx
location /uploads/ {
    alias /path/to/SecondBrain/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 4. 磁盘空间监控

定期监控 `uploads/` 目录大小，避免磁盘空间不足。

## 安全考虑

1. **文件类型验证**：只允许白名单中的文件类型
2. **文件大小限制**：防止恶意上传大文件
3. **用户身份验证**：所有上传操作需要登录
4. **文件名处理**：使用时间戳和用户ID生成唯一文件名，避免冲突和路径遍历攻击
5. **病毒扫描**：生产环境建议集成病毒扫描服务

## 未来改进

1. **图片压缩**：自动压缩大图片
2. **缩略图生成**：为图片生成缩略图
3. **拖拽上传**：支持拖拽文件到页面上传
4. **粘贴上传**：支持从剪贴板粘贴图片
5. **云存储集成**：支持阿里云 OSS、AWS S3 等
6. **附件搜索**：支持按附件名称搜索内容
7. **附件统计**：显示总附件数量和占用空间

## 相关文件

- [server/routes/upload.js](../server/routes/upload.js) - 文件上传 API
- [server/routes/contents.js](../server/routes/contents.js) - 内容 API（支持附件）
- [server/index.js](../server/index.js) - 服务器配置
- [src/views/ContentEditView.vue](../src/views/ContentEditView.vue) - 编辑页面
- [src/views/ContentDetailView.vue](../src/views/ContentDetailView.vue) - 详情页面
- [server/models/database.js](../server/models/database.js) - 数据库模型

## 测试建议

1. **功能测试**：
   - 上传不同类型的文件
   - 上传多个文件
   - 删除附件
   - 查看附件

2. **边界测试**：
   - 上传超大文件（应该被拒绝）
   - 上传不支持的文件类型（应该被拒绝）
   - 同时上传多个文件

3. **安全测试**：
   - 尝试上传恶意文件
   - 尝试访问其他用户的附件
   - 尝试路径遍历攻击

## 常见问题

### Q: 上传失败怎么办？
A: 检查：
1. 文件大小是否超过 50MB
2. 文件类型是否支持
3. `uploads/` 目录是否有写入权限
4. 网络连接是否正常

### Q: 附件不显示怎么办？
A: 检查：
1. 附件 URL 是否正确
2. 静态文件服务是否正常
3. 浏览器控制台是否有错误

### Q: 如何迁移到云存储？
A: 修改 `server/routes/upload.js`：
1. 安装对应的 SDK（如 `ali-oss`）
2. 配置存储桶信息
3. 修改 `storage` 配置
4. 更新文件 URL 生成逻辑
