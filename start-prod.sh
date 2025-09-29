#!/bin/bash

# 生产环境启动脚本

set -e

echo "🚀 启动 cinex 生产环境..."

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p ./db
mkdir -p ./media

# 设置目录权限
chmod 755 ./db
chmod 755 ./media

echo "🔧 构建并启动服务..."

# 首先构建跨平台镜像
echo "🏗️  构建 Linux x86_64 镜像..."
./build-prod.sh

# 启动服务（不需要重新构建）
echo "🚀 启动生产环境服务..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

echo "🏥 检查应用健康状态..."
for i in {1..30}; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ 应用启动成功！"
        echo "🌐 应用访问地址: http://localhost:3000"
        echo "📊 健康检查: http://localhost:3000/api/health"
        echo "📈 调度器状态: http://localhost:3000/api/scheduler/status"
        break
    else
        echo "⏳ 等待应用启动... ($i/30)"
        sleep 2
    fi
done

if [ $i -eq 30 ]; then
    echo "❌ 应用启动超时，请检查日志:"
    echo "docker-compose -f docker-compose.prod.yml logs"
fi

echo ""
echo "📋 常用命令:"
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "  查看状态: docker-compose -f docker-compose.prod.yml ps"
echo ""
