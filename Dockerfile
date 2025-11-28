# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm 和系统依赖
RUN npm install -g pnpm && \
    apk add --no-cache libc6-compat

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# 复制 pnpm-workspace.yaml（如果存在）
COPY pnpm-workspace.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 生成 Prisma client（在安装依赖后）
RUN pnpm prisma generate

# 复制源代码
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN pnpm build

# 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    bash \
    dumb-init \
    coreutils

# 复制构建产物和必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 复制完整的 node_modules（确保bot脚本依赖完整）
COPY --from=builder /app/node_modules ./node_modules

# 复制package.json以保持依赖信息
COPY --from=builder /app/package.json ./package.json

# 复制脚本文件和源代码
COPY scripts ./scripts
COPY src ./src
COPY docker/start.sh /app/

# 设置权限
RUN chmod +x /app/start.sh && \
    chown -R root:root /app

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# 使用 dumb-init 处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动脚本
CMD ["/app/start.sh"]
