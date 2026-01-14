# Docker 部署说明

## 智能数据库迁移方案

本项目使用智能数据库迁移方案，能够自动处理新部署和升级场景。

### 工作原理

1. **首次部署**（空数据库）
   - 检测到 `_prisma_migrations` 表不存在
   - 自动执行所有迁移 SQL 文件
   - 创建所有数据库表
   - 标记所有迁移为已应用

2. **升级部署**（已有数据库）
   - 检测到 `_prisma_migrations` 表存在
   - 使用 `prisma migrate deploy` 检查并应用新迁移
   - 只执行未应用的迁移

### 构建和运行

```bash
# 构建镜像
docker-compose -f docker-compose.local.yml build

# 启动服务
docker-compose -f docker-compose.local.yml up -d

# 查看日志
docker-compose -f docker-compose.local.yml logs -f app

# 停止服务
docker-compose -f docker-compose.local.yml down
```

### 数据库表

应用包含以下数据库表：

**认证表** (Better Auth):
- user, session, account, verification

**应用表**:
- Document, DocumentDownloadURL
- Movie, Subscribe, SubscribeMovie
- ForumSubscribe, ForumPost
- Setting, FileTransferLog, TelegramMessage

### 环境变量

必需的环境变量（在 docker-compose.yml 中配置）：

```yaml
DATABASE_URL: postgresql://user:password@host:port/database
DATABASE_HOST: postgres
DATABASE_PORT: 5432
DATABASE_USER: cinex
BETTER_AUTH_SECRET: your-secret-key
BETTER_AUTH_URL: http://your-domain:3100
```

### 故障排除

如果遇到迁移问题：

1. 查看容器日志：
   ```bash
   docker logs cinex-app
   ```

2. 检查数据库表：
   ```bash
   docker exec cinex-app psql $DATABASE_URL -c '\dt'
   ```

3. 手动执行迁移（如果需要）：
   ```bash
   docker exec cinex-app psql $DATABASE_URL -f prisma/migrations/xxx/migration.sql
   ```

### 添加新迁移

1. 在本地创建新的 Prisma 迁移：
   ```bash
   pnpm exec prisma migrate dev --name your_migration_name
   ```

2. 重新构建 Docker 镜像

3. 部署时会自动应用新迁移
