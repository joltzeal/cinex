#!/bin/bash

# 生产环境停止脚本

set -e

echo "🛑 停止 cinex 生产环境..."

# 停止服务
docker-compose -f docker-compose.prod.yml down

echo "✅ 生产环境已停止"
echo ""
echo "📋 其他操作:"
echo "  完全清理（包括镜像）: docker-compose -f docker-compose.prod.yml down --rmi all"
echo "  清理数据（谨慎操作）: rm -rf ./db"
echo ""
