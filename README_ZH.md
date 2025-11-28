# CINEX - 智能影视内容管理系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)
![React](https://img.shields.io/badge/React-19.0.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

一个功能强大的影视内容管理、订阅、下载和媒体库整合系统

[功能特性](#功能特性) • [快速开始](#快速开始) • [架构设计](#架构设计) • [API 文档](#api-文档) • [部署指南](#部署指南)

</div>

---

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [开发指南](#开发指南)
- [API 文档](#api-文档)
- [部署指南](#部署指南)
- [项目结构](#项目结构)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 🎯 项目简介

CINEX 是一个基于 Next.js 构建的现代化影视内容管理平台，集成了以下核心功能:

- 🎬 **影视订阅**: 自动订阅和更新影视内容
- 🔍 **智能搜索**: 多源磁力搜索和番号查询
- 📥 **下载管理**: 支持 qBittorrent 和 Transmission
- 📚 **媒体库整合**: 与 Jellyfin/Emby 无缝对接
- 🤖 **AI 辅助**: 集成 OpenAI 进行内容分析
- 📱 **Telegram Bot**: 消息推送和远程控制
- 🌐 **论坛爬虫**: 自动抓取和整理论坛内容
- 📊 **可视化面板**: 实时监控系统状态和下载进度

---

## ✨ 功能特性

### 核心功能

#### 1. 影视管理

- ✅ 多源影视数据爬取 (JAVBUS, JAVDB)
- ✅ 自动获取元数据 (标题、封面、演员、标签等)
- ✅ NFO 文件生成 (Kodi/Jellyfin 兼容)
- ✅ 影视评分和评论系统
- ✅ 看板式任务管理

#### 2. 订阅系统

- ✅ 按演员、类型、标签自动订阅
- ✅ 增量更新机制
- ✅ 自定义订阅规则和过滤器
- ✅ 订阅状态追踪

#### 3. 下载管理

- ✅ 支持 qBittorrent 和 Transmission
- ✅ 磁力链接自动下载
- ✅ 下载进度实时监控
- ✅ 智能速率限制
- ✅ 完成后自动转移到媒体库

#### 4. 媒体库整合

- ✅ Jellyfin/Emby 服务器同步
- ✅ 自动刮削器集成
- ✅ 海报墙展示
- ✅ 媒体文件管理

#### 5. 论坛爬虫

- ✅ 论坛帖子订阅
- ✅ 自动内容抓取
- ✅ 已读/未读标记
- ✅ 图片和附件下载

#### 6. 智能功能

- ✅ AI 内容分析和推荐
- ✅ 番号智能识别
- ✅ 磁力链接预览
- ✅ 文件大小转换和比较

#### 7. 系统监控

- ✅ 实时下载速度图表
- ✅ 存储空间监控
- ✅ 最近添加的媒体
- ✅ 系统统计信息

---

## 🛠 技术栈

### 前端

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **类型系统**: TypeScript 5.7
- **样式**: TailwindCSS 4.0 + Radix UI
- **状态管理**: Zustand
- **动画**: Framer Motion
- **表单**: React Hook Form + Zod
- **图表**: Recharts

### 后端

- **运行时**: Node.js
- **API**: Next.js API Routes
- **数据库**: PostgreSQL
- **ORM**: Prisma 6.14
- **认证**: NextAuth.js 5.0

### 第三方集成

- **下载器**: qBittorrent API, Transmission RPC
- **媒体服务器**: Jellyfin SDK, Emby SDK
- **AI**: OpenAI API
- **消息推送**: Telegram Bot API
- **元数据**: MetaTube API
- **爬虫**: Cheerio, node-html-parser

### 开发工具

- **包管理器**: pnpm
- **代码规范**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **进程管理**: PM2
- **任务调度**: node-cron

---

## 🏗 系统架构

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                    前端展示层 (React)                      │
│   Dashboard │ Subscribe │ Download │ Media │ Settings   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│               API 路由层 (Next.js API Routes)            │
│    /api/movie  │  /api/subscribe  │  /api/download      │
│    /api/forum  │  /api/media-library  │  /api/system   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│                  业务逻辑层 (Services)                     │
│   MovieService │ SubscribeService │ DownloadService     │
│   ForumService │ MediaLibraryService │ SettingsService  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│                   核心库层 (Lib)                          │
│   爬虫解析器 │ HTTP 客户端 │ 任务调度 │ 文件处理        │
│   javbus-parser │ proxyFetch │ scheduler │ nfo-generator│
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│              数据持久层 (Prisma + PostgreSQL)             │
│   Movie │ Subscribe │ User │ Forum │ Document          │
└─────────────────────────────────────────────────────────┘
\`\`\`

### 数据流向

\`\`\`
用户请求 → API Routes → Services → Lib/Utils → Database
   ↑                                              ↓
   └──────────────── 响应数据 ──────────────────────┘
\`\`\`

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0
- PostgreSQL >= 14
- pnpm >= 8.0
- Docker (可选，用于容器化部署)

### 安装步骤

1. **克隆仓库**

\`\`\`bash
git clone https://github.com/yourusername/cinex.git
cd cinex
\`\`\`

2. **安装依赖**

\`\`\`bash
pnpm install
\`\`\`

3. **配置环境变量**

\`\`\`bash
cp .env.example .env
\`\`\`

编辑 \`.env\` 文件，填入你的配置:

\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/cinex"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
\`\`\`

4. **初始化数据库**

\`\`\`bash

# 运行数据库迁移

npx prisma migrate deploy

# (可选) 生成 Prisma Client

npx prisma generate
\`\`\`

5. **启动开发服务器**

\`\`\`bash
pnpm dev
\`\`\`

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 首次使用

1. 访问 \`/auth/register\` 创建管理员账户
2. 登录后进入 \`/dashboard/settings\` 配置:
   - 下载器 (qBittorrent/Transmission)
   - 媒体服务器 (Jellyfin/Emby)
   - 代理设置 (如需要)
   - AI 提供商 (OpenAI)
3. 开始订阅和管理你的内容!

---

## ⚙️ 环境配置

### 必需配置

| 变量名              | 说明                                                 | 示例                                            |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| \`DATABASE_URL\`    | PostgreSQL 连接字符串                                | \`postgresql://user:pass@localhost:5432/cinex\` |
| \`NEXTAUTH_SECRET\` | NextAuth 密钥 (使用\`openssl rand -base64 32\` 生成) | \`xemRs422hgU5TnPI/6Cx9qbz...\`                 |
| \`NEXTAUTH_URL\`    | 应用访问地址                                         | \`http://localhost:3000\`                       |

### 可选配置

| 变量名                          | 说明               | 默认值    |
| ------------------------------- | ------------------ | --------- |
| \`ENABLE_SCHEDULER\`            | 启用定时任务       | \`false\` |
| \`DEFAULT_SUBSCRIBE_MAX_PAGES\` | 订阅最大页数       | \`100\`   |
| \`DEFAULT_SUBSCRIBE_DELAY_MS\`  | 订阅请求延迟 (ms)  | \`1000\`  |
| \`HTTP_PROXY\`                  | HTTP 代理地址      | -         |
| \`HTTPS_PROXY\`                 | HTTPS 代理地址     | -         |
| \`METATUBE_API_HOST\`           | MetaTube API 地址  | -         |
| \`METATUBE_API_TOKEN\`          | MetaTube API Token | -         |

---

## 💻 开发指南

### 项目结构

\`\`\`
cinex/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由 (45+ endpoints)
│   │   ├── auth/              # 认证页面
│   │   └── dashboard/         # 主应用界面
│   ├── lib/                   # 核心业务库 (46 个文件)
│   │   ├── javbus-parser.ts   # JAVBUS 爬虫
│   │   ├── javdb-parser.ts    # JAVDB 爬虫
│   │   ├── downloader.ts      # 下载管理
│   │   ├── scheduler.ts       # 任务调度
│   │   └── utils/             # 工具函数
│   ├── components/            # React 组件 (129 个)
│   │   ├── ui/                # 基础 UI 组件 (52 个)
│   │   ├── JAV/               # 业务组件
│   │   └── search/            # 搜索组件
│   ├── services/              # 数据访问层
│   ├── features/              # 特性模块
│   ├── types/                 # TypeScript 类型定义
│   ├── hooks/                 # 自定义 React Hooks
│   ├── contexts/              # React Context
│   ├── store/                 # Zustand 状态管理
│   └── constants/             # 常量定义
├── prisma/                    # 数据库 Schema 和迁移
├── scripts/                   # 工具脚本
├── public/                    # 静态资源
└── .drone.yml                 # CI/CD 配置
\`\`\`

### 开发命令

\`bash

# 开发模式

pnpm dev

# 构建生产版本

pnpm build

# 启动生产服务器

pnpm start

# 代码检查

pnpm lint

# 代码格式化

pnpm format

# 数据导出/导入

pnpm export:data
pnpm import:data

# 并发运行开发服务器和脚本

pnpm dev:all
\`\`\`

---

## 🐳 部署指南

### Docker 部署

1. **构建镜像**

\`\`\`bash
docker build -t cinex:latest .
\`\`\`

2. **运行容器**

\`\`\`bash
docker run -d \\
  --name cinex \\
  -p 3000:3000 \\
  -e DATABASE_URL="postgresql://..." \\
  -e NEXTAUTH_SECRET="..." \\
  -v /path/to/data:/app/data \\
  cinex:latest
\`\`\`

### GitHub Actions (推荐)

项目已配置 GitHub Actions 自动构建并推送到 Docker Hub。

**配置步骤**:

1. 在 GitHub 仓库设置中添加 Secrets:
   - \`DOCKER_USERNAME\`: 你的 Docker Hub 用户名
   - \`DOCKER_PASSWORD\`: Docker Hub Access Token

2. 推送代码到 \`main\` 分支或创建版本标签即可自动触发构建

3. 查看构建状态: 仓库 → Actions 页面

**使用构建的镜像**:

\`\`\`bash
# 从 Docker Hub 拉取
docker pull <你的用户名>/cinex:latest

# 运行容器
docker run -d \\
  --name cinex \\
  -p 3000:3000 \\
  -e DATABASE_URL="postgresql://..." \\
  -e NEXTAUTH_SECRET="..." \\
  <你的用户名>/cinex:latest
\`\`\`

详细配置说明请查看 [GitHub Actions 文档](.github/workflows/README.md)

### Drone CI/CD (可选)

项目也包含 \`.drone.yml\` 配置文件，支持自动构建和推送到私有 Docker 仓库。

配置步骤:

1. 设置 Drone 服务器
2. 添加仓库到 Drone
3. 配置 Secret: \`webhook_url\` (可选，用于通知)
4. 推送到 \`main\` 分支自动触发构建

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Prisma](https://www.prisma.io/) - ORM
- [Radix UI](https://www.radix-ui.com/) - 无样式组件
- [Shadcn UI](https://ui.shadcn.com/) - UI 组件库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架

---

## 📞 联系方式

- 作者: Kiran
- GitHub: [@Kiranism](https://github.com/Kiranism)

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐️**

Made with ❤️ by [Kiran](https://github.com/Kiranism)

</div>
