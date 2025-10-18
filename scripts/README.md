# 数据迁移脚本

将 Movie 和 Subscribe 的关系从一对多迁移到多对多。

## 🚀 推荐方式：安全迁移流程

### 一键执行（推荐）

```bash
./scripts/run-safe-migration.sh
```

这会自动完成：导出 → 迁移 → 导入 → 验证

### 手动执行各步骤

```bash
# 1. 导出数据
pnpm run export:data

# 2. 运行 Prisma 迁移
npx prisma migrate dev --name change_to_many_to_many

# 3. 重新生成 Client
npx prisma generate

# 4. 导入数据
pnpm run import:data

# 5. 验证结果
pnpm run verify:migration
```

## 文件说明

### 核心脚本

- **`export-data.ts`** - 数据导出脚本 ⭐ 新增
  - 导出 Subscribe 和 Movie 表到 CSV
  - 自动分析重复数据
  - 生成元数据文件

- **`import-data.ts`** - 数据导入脚本 ⭐ 新增
  - 从 CSV 导入数据到新表结构
  - 自动合并重复的电影
  - 创建订阅关系

- **`migrate-to-many-to-many.ts`** - 数据库内迁移脚本
  - 直接在数据库中操作
  - 读取现有数据
  - 合并重复的电影（相同番号）
  - 创建中间表和关系
  - 更新表结构

- **`verify-migration.ts`** - 验证脚本
  - 检查数据完整性
  - 验证唯一性约束
  - 检查孤立记录
  - 验证索引

### 一键脚本

- **`run-safe-migration.sh`** - 安全迁移流程 ⭐ 推荐
  - 导出 → 迁移 → 导入 → 验证
  - 交互式确认
  - 完整的错误处理

- **`run-full-migration.sh`** - 数据库内迁移流程
  - 直接修改数据库
  - 适合高级用户

### 文档

- **`MIGRATION_GUIDE.md`** - 详细迁移指南
  - 完整的迁移步骤
  - 代码更新示例
  - 常见问题解答

## 迁移做什么

### 数据变化

**之前:**
```
Movie { id, subscribeId, number: "ABC-123", ... }
Movie { id, subscribeId, number: "ABC-123", ... }  // 重复！
```

**之后:**
```
Movie { id, number: "ABC-123", ... }  // 唯一！
SubscribeMovie { subscribeId, movieId }
SubscribeMovie { subscribeId, movieId }
```

### 查询变化

**之前:**
```typescript
const movies = await prisma.movie.findMany({
  where: { subscribeId }
});
```

**之后:**
```typescript
const subscribe = await prisma.subscribe.findUnique({
  where: { id: subscribeId },
  include: {
    movies: {
      include: { movie: true }
    }
  }
});
```

## 安全特性

✅ 自动创建备份表 `Movie_backup`  
✅ 保留所有原始数据  
✅ 详细的进度日志  
✅ 迁移后验证功能  
✅ 支持回滚

## 常见问题

**Q: 迁移需要多久？**  
A: 取决于数据量，通常几百条记录在几秒内完成。

**Q: 如何回滚？**  
A: 数据备份在 `Movie_backup` 表中，可以手动恢复。

**Q: 重复的电影如何处理？**  
A: 保留最新更新的记录（基于 `updatedAt`），所有订阅关系都会保留。

## 详细文档

查看 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 获取完整的迁移指南和代码示例。

