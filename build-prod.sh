#!/bin/bash

# 生产环境跨平台构建脚本
# 在 Mac 上构建适用于 Linux x86_64 的镜像

set -e

echo "🔧 配置跨平台构建环境..."

# 检查是否有 buildx 插件
if ! docker buildx version >/dev/null 2>&1; then
    echo "❌ Docker Buildx 未安装，请先安装 Docker Desktop 或 Docker Buildx 插件"
    exit 1
fi

# 创建并使用多平台构建器
echo "🛠️  创建多平台构建器..."
docker buildx create --name cinex-builder --use --bootstrap 2>/dev/null || docker buildx use cinex-builder

echo "📋 当前构建器信息："
docker buildx inspect --bootstrap

echo "🏗️  开始构建 Linux x86_64 镜像..."

# 构建镜像并加载到本地 Docker
docker buildx build \
    --platform linux/amd64 \
    --tag cinex:latest \
    --load \
    --no-cache \
    .

echo "✅ 镜像构建完成！"

# 显示镜像信息
echo "📊 镜像信息："
docker images cinex:latest

echo ""
echo "🚀 现在可以使用以下命令启动生产环境："
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "💡 或者使用启动脚本："
echo "  ./start-prod.sh"
echo ""
