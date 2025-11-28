# GitHub Actions 工作流配置说明

## Docker 镜像自动构建和发布

本项目使用 GitHub Actions 自动构建 Docker 镜像并发布到 Docker Hub。

### 📋 功能特性

- ✅ 自动构建多平台镜像 (linux/amd64, linux/arm64)
- ✅ 推送到 Docker Hub
- ✅ 支持多种标签策略
- ✅ 使用 GitHub Actions Cache 加速构建
- ✅ 支持手动触发构建

### 🔧 配置步骤

#### 1. 设置 Docker Hub Secrets

在你的 GitHub 仓库中配置以下 Secrets:

1. 进入仓库设置: `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret` 添加以下密钥:

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | 你的 Docker Hub 账号 |
| `DOCKER_PASSWORD` | Docker Hub 访问令牌 | 在 Docker Hub → Account Settings → Security → New Access Token |

**重要**: 建议使用 Access Token 而非密码，更安全！

#### 2. 触发条件

工作流会在以下情况下自动触发:

- ✅ 推送到 `main` 或 `master` 分支
- ✅ 创建版本标签 (如 `v1.0.0`)
- ✅ 创建 Pull Request
- ✅ 手动触发 (在 Actions 页面点击 "Run workflow")

### 🏷️ 镜像标签策略

根据不同的触发事件，会自动生成不同的镜像标签:

| 触发事件 | 生成的标签 | 示例 |
|---------|-----------|------|
| 推送到主分支 | `latest`, `<branch>-<sha>` | `latest`, `main-abc1234` |
| 推送 tag | `<version>`, `<major>.<minor>`, `<major>` | `v1.2.3`, `1.2`, `1` |
| Pull Request | `pr-<number>` | `pr-42` |
| 其他分支 | `<branch>` | `develop` |

### 📦 使用构建的镜像

#### 从 Docker Hub 拉取

```bash
# 拉取最新版本
docker pull <你的用户名>/cinex:latest

# 拉取特定版本
docker pull <你的用户名>/cinex:v1.0.0

# 拉取特定分支
docker pull <你的用户名>/cinex:main-abc1234
```

#### 运行容器

```bash
docker run -d \
  --name cinex \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  <你的用户名>/cinex:latest
```

### 🚀 手动触发构建

1. 进入仓库的 `Actions` 页面
2. 选择 `Build and Push Docker Image` 工作流
3. 点击 `Run workflow`
4. 选择分支并点击 `Run workflow` 按钮

### 🔍 查看构建状态

- 在仓库主页，可以看到工作流状态徽章
- 点击 `Actions` 标签查看详细的构建日志
- 每次构建完成后会显示推送的镜像标签

### 📝 自定义配置

#### 修改镜像名称

编辑 `.github/workflows/docker-publish.yml`:

```yaml
env:
  DOCKER_IMAGE_NAME: your-custom-name  # 修改为你的镜像名
```

#### 修改支持的平台

```yaml
env:
  PLATFORMS: linux/amd64,linux/arm64,linux/arm/v7  # 添加更多平台
```

#### 仅构建单平台 (更快)

```yaml
env:
  PLATFORMS: linux/amd64  # 仅构建 amd64
```

### 🐛 常见问题

#### Q: 构建失败，提示 "unauthorized: authentication required"

A: 检查 Docker Hub Secrets 是否正确配置:
- `DOCKER_USERNAME` 必须是你的 Docker Hub 用户名
- `DOCKER_PASSWORD` 必须是有效的 Access Token

#### Q: 构建很慢

A:
- GitHub Actions 缓存会在第二次构建时加速
- 可以只构建单平台 (`linux/amd64`) 来加快速度
- 多平台构建第一次可能需要 10-20 分钟

#### Q: 如何只在发布 tag 时推送镜像?

A: 修改工作流的触发条件:

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

#### Q: 想要推送到私有仓库

A: 修改 Docker Hub 登录步骤的 registry:

```yaml
- name: Log in to Private Registry
  uses: docker/login-action@v3
  with:
    registry: your-registry.com
    username: ${{ secrets.REGISTRY_USERNAME }}
    password: ${{ secrets.REGISTRY_PASSWORD }}
```

### 📊 构建优化建议

1. **使用多阶段构建**: Dockerfile 已经使用了多阶段构建来减小镜像大小
2. **层缓存**: GitHub Actions 自动使用 `cache-from` 和 `cache-to` 缓存构建层
3. **并行构建**: 使用 Buildx 可以并行构建多个平台

### 🔗 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Docker Hub](https://hub.docker.com/)

---

**配置完成后，每次推送代码到 main 分支，都会自动构建并推送 Docker 镜像！** 🎉
