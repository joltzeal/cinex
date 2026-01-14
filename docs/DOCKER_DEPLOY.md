# Docker Compose 在 NAS 中运行指南

## 1. 准备工作

在 NAS 上创建项目目录并上传文件：
```bash
# 创建项目目录
mkdir -p /path/to/cinex
cd /path/to/cinex

# 上传 Dockerfile, docker-compose.yml 等文件到此目录
```

## 2. 创建 .env 文件

复制 `.env.example` 并修改配置：
```bash
cp .env.example .env
nano .env  # 或使用其他编辑器
```

修改以下配置：
- `POSTGRES_PASSWORD`: 设置安全的数据库密码
- `MEDIA_PATH`: 设置 NAS 上的媒体存储路径
- `APP_PORT`: 设置应用端口（默认 8078）
- `NEXT_PUBLIC_APP_URL`: 设置 NAS 的访问地址

## 3. 运行命令

```bash
# 启动服务（首次运行会构建镜像）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看运行状态
docker-compose ps
```

## 4. 数据库迁移

首次运行需要执行数据库迁移：
```bash
docker-compose exec app npx prisma migrate deploy
```

## 5. 访问应用

浏览器访问：`http://your-nas-ip:8078`

## 注意事项

- 确保 NAS 上的媒体目录有正确的读写权限
- 数据库数据存储在 Docker volume `cinex_data` 中
- 修改 `.env` 后需要重启服务：`docker-compose up -d`
