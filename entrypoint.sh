#!/bin/bash

# 设置错误处理
set -e

echo "启动容器..."

# 运行数据库迁移（如果需要）
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "运行数据库迁移..."
    npx prisma migrate deploy
fi

# 启动 Next.js 应用（后台运行）
echo "启动 Next.js 应用..."
node server.js &
NEXTJS_PID=$!

# 等待一段时间确保 Next.js 启动
sleep 5

# 启动 cron 调度器（后台运行）
echo "启动 Cron 调度器..."
node /app/scripts/index.js &
CRON_PID=$!

# 优雅关闭处理函数
cleanup() {
    echo "正在关闭服务..."
    
    # 关闭 cron 调度器
    if [ ! -z "$CRON_PID" ]; then
        echo "关闭 Cron 调度器 (PID: $CRON_PID)"
        kill -TERM "$CRON_PID" 2>/dev/null || true
        wait "$CRON_PID" 2>/dev/null || true
    fi
    
    # 关闭 Next.js 应用
    if [ ! -z "$NEXTJS_PID" ]; then
        echo "关闭 Next.js 应用 (PID: $NEXTJS_PID)"
        kill -TERM "$NEXTJS_PID" 2>/dev/null || true
        wait "$NEXTJS_PID" 2>/dev/null || true
    fi
    
    echo "所有服务已关闭"
    exit 0
}

# 注册信号处理器
trap cleanup SIGTERM SIGINT

echo "所有服务已启动"
echo "Next.js PID: $NEXTJS_PID"
echo "Cron PID: $CRON_PID"

# 等待任一进程退出
wait