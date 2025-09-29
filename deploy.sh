#!/bin/bash

# 部署脚本 - 构建 x86_64 镜像并推送到私有仓库

set -e

# 配置变量
REGISTRY="192.168.0.79:5000"
IMAGE_NAME="cinex"
TAG="latest"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
PLATFORM="linux/amd64"

echo "🚀 开始部署流程..."
echo "📋 配置信息:"
echo "  仓库地址: ${REGISTRY}"
echo "  镜像名称: ${IMAGE_NAME}"
echo "  标签: ${TAG}"
echo "  目标平台: ${PLATFORM}"
echo "  完整镜像名: ${FULL_IMAGE_NAME}"
echo ""

# 检查 Docker Buildx
echo "🔧 检查 Docker Buildx..."
if ! docker buildx version >/dev/null 2>&1; then
    echo "❌ Docker Buildx 未安装，请先安装 Docker Desktop 或 Docker Buildx 插件"
    exit 1
fi

# 创建并使用多平台构建器
echo "🛠️  配置多平台构建器..."
docker buildx create --name cinex-deploy-builder --use --bootstrap 2>/dev/null || docker buildx use cinex-deploy-builder

echo "📋 构建器信息："
docker buildx inspect --bootstrap

# 检查私有仓库连接
echo "🔗 检查私有仓库连接..."
if ! curl -f http://${REGISTRY}/v2/ >/dev/null 2>&1; then
    echo "⚠️  警告: 无法连接到私有仓库 ${REGISTRY}"
    echo "   请确保:"
    echo "   1. 仓库服务正在运行"
    echo "   2. 网络连接正常"
    echo "   3. 防火墙允许访问端口 5000"
    echo ""
    read -p "是否继续构建？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 部署已取消"
        exit 1
    fi
fi

# 构建镜像
echo "🏗️  构建 ${PLATFORM} 镜像..."
docker buildx build \
    --platform ${PLATFORM} \
    --tag ${FULL_IMAGE_NAME} \
    --push \
    --no-cache \
    .

echo "✅ 镜像构建并推送完成！"

# 验证推送结果
echo "🔍 验证推送结果..."
if curl -f http://${REGISTRY}/v2/${IMAGE_NAME}/tags/list >/dev/null 2>&1; then
    echo "✅ 镜像已成功推送到私有仓库"
    echo "📊 仓库中的标签:"
    curl -s http://${REGISTRY}/v2/${IMAGE_NAME}/tags/list | jq . 2>/dev/null || curl -s http://${REGISTRY}/v2/${IMAGE_NAME}/tags/list
else
    echo "⚠️  无法验证推送结果，但构建过程已完成"
fi

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 部署信息:"
echo "  镜像地址: ${FULL_IMAGE_NAME}"
echo "  架构: x86_64"
echo "  推送时间: $(date)"
echo ""
echo "🚀 在生产服务器上使用以下命令拉取镜像:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "💡 或者在生产服务器上创建 docker-compose.yml:"
echo "  services:"
echo "    cinex:"
echo "      image: ${FULL_IMAGE_NAME}"
echo "      # ... 其他配置"
echo ""

# 可选：生成生产环境的 docker-compose 文件
read -p "是否生成生产服务器用的 docker-compose 文件？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > docker-compose.production.yml << EOF
version: '3.8'

services:
  cinex:
    image: ${FULL_IMAGE_NAME}
    container_name: cinex-app-production
    ports:
      - "3000:3000"
    environment:
      # Node.js 环境配置
      - NODE_ENV=production
      - ENABLE_SCHEDULER=true
      - DATABASE_URL=postgresql://cinex:cinex@postgres:5432/cinex?schema=public
      - DEFAULT_SUBSCRIBE_MAX_PAGES=100
      - DEFAULT_SUBSCRIBE_DELAY_MS=1000
      - AUTH_TRUST_HOST=true
      - RUN_MIGRATIONS=true
      
      # 应用 URL 配置
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - NEXTJS_URL=http://localhost:3000
      
      # 认证配置
      - NEXTAUTH_SECRET=xemRs422hgU5TnPI/6Cx9qbz1FrBb1UE4yBBtsTIVUA=
      - NEXTAUTH_URL=http://localhost:3000
      
      # API 配置
      - METATUBE_API_HOST=https://rich-coralyn-ameno-7c7b1b86.koyeb.app
      - METATUBE_API_TOKEN=bravesfly
      
    volumes:
      - ./media:/app/media
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - cinex-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  postgres:
    image: postgres:14-alpine
    container_name: cinex-postgres-production
    environment:
      - POSTGRES_DB=cinex
      - POSTGRES_USER=cinex
      - POSTGRES_PASSWORD=cinex
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - ./db:/var/lib/postgresql/data
    networks:
      - cinex-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cinex -d cinex"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

networks:
  cinex-network:
    driver: bridge
EOF

    echo "✅ 已生成 docker-compose.production.yml 文件"
    echo "📁 请将此文件传输到生产服务器使用"
fi

echo ""
echo "🎯 下一步操作:"
echo "1. 将 docker-compose.production.yml 上传到生产服务器"
echo "2. 在生产服务器上运行: docker-compose -f docker-compose.production.yml up -d"
echo "3. 检查服务状态: docker-compose -f docker-compose.production.yml ps"
echo ""
