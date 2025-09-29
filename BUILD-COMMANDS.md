# 跨平台构建命令

## 在 Mac 上构建 Linux x86_64 镜像

### 方法 1: 使用脚本（推荐）

```bash
# 构建镜像
./build-prod.sh

# 启动生产环境
./start-prod.sh
```

### 方法 2: 手动命令

#### 设置 buildx（仅需执行一次）

```bash
# 创建多平台构建器
docker buildx create --name pvideo-builder --use --bootstrap

# 检查构建器
docker buildx inspect --bootstrap
```

#### 构建命令

```bash
# 构建 Linux x86_64 镜像
docker buildx build \
    --platform linux/amd64 \
    --tag pvideo:latest \
    --load \
    --no-cache \
    .
```

#### 启动服务

```bash
# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 方法 3: Docker Compose 直接构建

```bash
# 使用 Docker Compose 构建（会自动处理平台）
docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

## 验证构建

```bash
# 查看镜像架构
docker image inspect pvideo:latest | grep Architecture

# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

## 故障排除

### 如果遇到 "exec format error"

1. 确保使用了正确的平台标志 `--platform linux/amd64`
2. 检查 Docker Desktop 是否启用了实验性功能
3. 重新创建 buildx 构建器：

```bash
docker buildx rm pvideo-builder
docker buildx create --name pvideo-builder --use --bootstrap
```

### 清理构建缓存

```bash
# 清理构建缓存
docker buildx prune

# 完全重建
docker buildx build --platform linux/amd64 --tag cinex:latest --load --no-cache .
```
