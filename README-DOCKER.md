# PVideo Docker 部署指南

## 环境说明

项目提供两套 Docker 配置：

- **开发环境**: `docker-compose.yml` - 使用外部数据库，端口 23000
- **生产环境**: `docker-compose.prod.yml` - 包含 PostgreSQL 14，端口 3000

## 生产环境部署

### 快速启动

```bash
# 启动生产环境
./start-prod.sh

# 停止生产环境
./stop-prod.sh
```

### 手动操作

```bash
# 构建并启动
docker-compose -f docker-compose.prod.yml up --build -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

## 生产环境配置

### 数据库配置
- **数据库**: PostgreSQL 14
- **用户名**: `pvideo`
- **密码**: `pvideo123`
- **数据库名**: `pvideo`
- **数据目录**: `./db` (本地挂载)

### 应用配置
- **端口**: 3000
- **健康检查**: http://localhost:3000/api/health
- **调度器状态**: http://localhost:3000/api/scheduler/status

### 目录结构
```
pvideo/
├── db/                 # PostgreSQL 数据目录
├── media/              # 媒体文件目录
├── docker-compose.yml  # 开发环境配置
├── docker-compose.prod.yml # 生产环境配置
├── start-prod.sh       # 生产环境启动脚本
└── stop-prod.sh        # 生产环境停止脚本
```

## 开发环境

```bash
# 开发环境（使用外部数据库）
docker-compose up --build -d

# 访问地址: http://localhost:23000
```

## 数据备份与恢复

### 备份数据库
```bash
# 进入数据库容器
docker-compose -f docker-compose.prod.yml exec postgres bash

# 创建备份
pg_dump -U pvideo pvideo > /var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢复数据库
```bash
# 进入数据库容器
docker-compose -f docker-compose.prod.yml exec postgres bash

# 恢复数据
psql -U pvideo pvideo < /var/lib/postgresql/data/backup_file.sql
```

## 监控与日志

### 查看应用日志
```bash
docker-compose -f docker-compose.prod.yml logs -f pvideo
```

### 查看数据库日志
```bash
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 健康检查
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/scheduler/status
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 确保端口 3000 和 5432 未被占用
   
2. **权限问题**
   - 确保 `./db` 目录有正确的权限
   - `chmod 755 ./db`

3. **数据库连接失败**
   - 检查数据库容器是否正常启动
   - 查看数据库日志排查问题

4. **应用启动失败**
   - 检查环境变量配置
   - 查看应用日志

### 重置环境
```bash
# 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 清理数据（谨慎操作）
rm -rf ./db

# 重新启动
./start-prod.sh
```

## 注意事项

1. **数据安全**: 生产环境请定期备份 `./db` 目录
2. **密码安全**: 建议修改默认密码 `pvideo123`
3. **防火墙**: 确保必要的端口已开放
4. **资源限制**: 根据服务器配置调整内存限制
