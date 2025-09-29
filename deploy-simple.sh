#!/bin/bash

# 简化部署脚本 - 快速构建并推送到私有仓库

set -e

REGISTRY="192.168.0.79:5000"
IMAGE_NAME="cinex"
TAG="latest"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "🚀 构建并推送镜像到 ${FULL_IMAGE_NAME}..."

# 确保使用多平台构建器
docker buildx create --name deploy-builder --use --bootstrap 2>/dev/null || docker buildx use deploy-builder

# 构建镜像并加载到本地 Docker
docker buildx build --platform linux/amd64 --load -t "$IMAGE_NAME:$TAG" .

# 标记并推送到私有仓库
docker tag "$IMAGE_NAME:$TAG" "$FULL_IMAGE_NAME"
docker push "$FULL_IMAGE_NAME"

echo "✅ 部署完成！镜像地址: ${FULL_IMAGE_NAME}"
