# Cinex Browser Extension

浏览器扩展，用于在网页中自动识别和高亮显示 JAV 番号代码。

## 功能特性

### 已完成功能

1. **设置页面 (Popup)**
   - 配置 API URL
   - 使用邮箱和密码登录
   - 持久化保存登录信息
   - 显示登录状态

2. **代码识别和高亮**
   - 自动识别页面中的番号代码（格式：ABCD-1234）
   - 支持的格式：
     - 字母部分：2-4 个字符
     - 数字部分：2-4 个字符
     - 使用懒惰匹配，避免匹配过长的字符串
   - 高亮显示识别到的代码
   - 支持动态加载的内容

3. **信息卡片**
   - 鼠标悬停在高亮番号上 1 秒后自动打开卡片
   - 显示番号详细信息：
     - 封面图片
     - 标题和基本信息
     - 演员列表
     - 标签分类
     - 预览截图（最多 3 张）
   - 加载状态提示
   - 错误处理和提示
   - 鼠标移开后自动关闭卡片
   - 可以将鼠标移到卡片上查看内容
   - 按 ESC 键关闭卡片
   - 自动调整卡片位置，避免超出屏幕

## 安装方法

### Chrome/Edge

1. 打开浏览器，进入扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. 开启"开发者模式"

3. 点击"加载已解压的扩展程序"

4. 选择 `extension` 文件夹

### Firefox

1. 打开浏览器，进入 `about:debugging#/runtime/this-firefox`

2. 点击"临时加载附加组件"

3. 选择 `extension` 文件夹中的 `manifest.json` 文件

## 使用方法

1. **首次设置**
   - 点击浏览器工具栏中的扩展图标
   - 输入 API URL（例如：`http://localhost:3000`）
   - 输入登录邮箱和密码
   - 点击"登录"按钮

2. **浏览网页**
   - 登录后，扩展会自动在所有网页中识别番号代码
   - 识别到的代码会以黄色背景高亮显示
   - 将鼠标悬停在番号上 1 秒，自动打开详细信息卡片
   - 卡片会显示封面、标题、演员、标签和预览图
   - 可以将鼠标移到卡片上继续查看
   - 鼠标移开后卡片自动关闭，或按 ESC 键关闭

3. **退出登录**
   - 点击扩展图标
   - 点击"退出登录"按钮

## 技术细节

### 文件结构

```
extension/
├── manifest.json       # 扩展配置文件
├── background.js       # 后台脚本（处理 API 请求）
├── popup.html         # 设置页面 HTML
├── popup.css          # 设置页面样式
├── popup.js           # 设置页面逻辑
├── content.js         # 内容脚本（代码识别和高亮）
├── content.css        # 内容脚本样式
└── icons/             # 扩展图标（需要添加）
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 正则表达式

代码识别使用的正则表达式：`/\b([A-Za-z]{2,4})-(\d{2,4})\b/g`

- `\b`: 单词边界，确保精确匹配
- `[A-Za-z]{2,4}`: 2-4 个字母（大小写不敏感）
- `-`: 连字符
- `\d{2,4}`: 2-4 个数字
- `\b`: 单词边界

示例匹配：
- ✅ `ABCD-1234`
- ✅ `AB-12`
- ✅ `ABCD-123`
- ❌ `ABCDE-12345` (超过 4 个字符)
- ❌ `A-1` (少于 2 个字符)

### API 集成

扩展使用 better-auth 进行身份验证，并通过 background script 处理 API 请求以避免 CORS 问题：

**架构说明**：
- Content Script：在网页中运行，负责识别和高亮番号
- Background Script：在后台运行，负责处理所有 API 请求（不受 CORS 限制）
- 通信方式：Content Script 通过 `chrome.runtime.sendMessage` 与 Background Script 通信

**登录端点**：`POST /api/auth/sign-in/email`
- 请求体：
  ```json
  {
    "email": "user@example.com",
    "password": "password"
  }
  ```

**获取电影信息**：`GET /api/movie/{code}`
- 请求头：`Authorization: Bearer {token}`
- 通过 Background Script 发起请求，避免 CORS 问题

## 注意事项

1. **图标文件**：需要在 `extension/icons/` 目录下添加 16x16、48x48 和 128x128 像素的图标文件

2. **CORS 处理**：
   - 扩展使用 Background Script 处理所有 API 请求
   - Background Script 不受浏览器 CORS 策略限制
   - Content Script 通过消息传递与 Background Script 通信
   - 后端已配置 `trustedOrigins` 允许扩展来源

3. **安全性**：
   - 密码不会被保存，只保存认证令牌
   - 使用 Chrome Storage API 进行本地存储
   - 所有 API 请求使用 HTTPS（生产环境）
   - API 令牌在 Background Script 中管理，更加安全

## 开发计划

- [x] 添加扩展图标
- [x] 实现信息卡片功能
- [x] 从 API 获取番号详细信息
- [x] 添加加载状态和错误处理
- [ ] 添加缓存机制，减少 API 请求
- [ ] 支持自定义高亮颜色
- [ ] 添加快捷键支持
- [ ] 图片预览功能（点击放大）
