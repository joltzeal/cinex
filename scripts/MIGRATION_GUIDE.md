# 数据迁移指南：一对多 → 多对多

## 概述

本指南帮助你将 Movie 和 Subscribe 的关系从**一对多**迁移到**多对多**关系。

### 变更内容

**旧结构：**
- 一个 Movie 只能属于一个 Subscribe
- Movie 表有 `subscribeId` 字段
- `@@unique([subscribeId, number])` - 同一订阅下番号唯一

**新结构：**
- 一个 Movie 可以属于多个 Subscribe
- Movie 表的 `number` 字段全局唯一
- 通过 `SubscribeMovie` 中间表关联
- 多个订阅可以共享同一个电影

---

## 迁移步骤

### 1. 备份数据库

⚠️ **重要：在执行任何操作前，请先备份数据库！**

```bash
# PostgreSQL 备份示例
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 更新 Prisma Schema

Prisma Schema 已经更新为新的多对多结构。当前的 `schema.prisma` 文件包含：

```prisma
model Subscribe {
  movies      SubscribeMovie[]  // 通过中间表关联
}

model Movie {
  number       String            @unique  // 全局唯一
  subscribes   SubscribeMovie[]  // 通过中间表关联
}

model SubscribeMovie {
  subscribeId String
  movieId     String
  subscribe   Subscribe @relation(...)
  movie       Movie     @relation(...)
  @@unique([subscribeId, movieId])
}
```

### 3. 运行迁移脚本

执行数据迁移脚本：

```bash
pnpm run migrate:many-to-many
```

或者直接运行：

```bash
tsx scripts/migrate-to-many-to-many.ts
```

### 4. 迁移脚本做什么

迁移脚本会自动执行以下操作：

1. **读取现有数据** - 从 Movie 表读取所有记录
2. **分析重复** - 按 `number` 分组，找出重复的电影
3. **创建备份** - 将原始数据备份到 `Movie_backup` 表
4. **创建中间表** - 创建 `SubscribeMovie` 表
5. **合并重复电影** - 对于相同的 `number`，保留最新的记录
6. **建立关系** - 在中间表中创建所有 Subscribe-Movie 关系
7. **更新表结构** - 删除 `subscribeId` 字段，添加唯一约束
8. **验证数据** - 统计并显示迁移结果

### 5. 迁移后操作

迁移成功后：

```bash
# 1. 重新生成 Prisma Client
npx prisma generate

# 2. 测试应用程序
pnpm dev

# 3. 确认一切正常后，删除备份表（可选）
# psql -U your_user -d your_database -c 'DROP TABLE "Movie_backup"'
```

---

## 代码更新指南

迁移完成后，你需要更新代码中的查询方式。

### 查询订阅的电影

**旧代码：**
```typescript
const movies = await prisma.movie.findMany({
  where: { subscribeId: 'xxx' }
});
```

**新代码：**
```typescript
const subscribe = await prisma.subscribe.findUnique({
  where: { id: 'xxx' },
  include: {
    movies: {
      include: {
        movie: true
      }
    }
  }
});

// 获取电影列表
const movieList = subscribe?.movies.map(sm => sm.movie) || [];
```

### 创建订阅和电影的关系

**新代码：**
```typescript
// 1. 查找或创建电影
const movie = await prisma.movie.upsert({
  where: { number: 'ABC-123' },
  update: {},
  create: {
    number: 'ABC-123',
    title: '电影标题',
    // ... 其他字段
  }
});

// 2. 创建关系
await prisma.subscribeMovie.create({
  data: {
    subscribeId: 'subscribe_id',
    movieId: movie.id
  }
});
```

### 删除订阅的电影关系

**新代码：**
```typescript
await prisma.subscribeMovie.deleteMany({
  where: {
    subscribeId: 'subscribe_id',
    movieId: 'movie_id'
  }
});
```

### 查询电影属于哪些订阅

**新代码：**
```typescript
const movie = await prisma.movie.findUnique({
  where: { number: 'ABC-123' },
  include: {
    subscribes: {
      include: {
        subscribe: true
      }
    }
  }
});

const subscribeList = movie?.subscribes.map(sm => sm.subscribe) || [];
```

---

## 常见问题

### Q: 如果迁移失败了怎么办？

A: 迁移脚本会创建 `Movie_backup` 表。如果失败，可以从备份表恢复：

```sql
-- 删除新表
DROP TABLE IF EXISTS "SubscribeMovie";
-- 恢复备份（需要手动调整）
```

### Q: 重复的电影会如何处理？

A: 迁移脚本会保留最新更新的电影记录（基于 `updatedAt`），并将所有相关的订阅关系都迁移到中间表。

### Q: 迁移需要多长时间？

A: 取决于数据量。每处理 10 条记录会显示进度。通常几百条记录在几秒内完成。

### Q: 迁移后可以回滚吗？

A: 可以从 `Movie_backup` 表恢复，但需要手动操作。建议在迁移前做好数据库完整备份。

---

## 验证清单

迁移完成后，请验证以下内容：

- [ ] Movie 表中的 `number` 字段没有重复
- [ ] 所有原有的电影数据都存在
- [ ] SubscribeMovie 中间表的关系正确
- [ ] 应用程序可以正常查询和显示数据
- [ ] 创建新订阅和电影的功能正常
- [ ] 没有孤立的记录（没有关联的 Movie）

---

## 技术支持

如果遇到问题，请：

1. 检查迁移脚本的日志输出
2. 查看 `Movie_backup` 表确认数据完整性
3. 验证 Prisma Schema 是否正确
4. 确保数据库连接正常

---

## 迁移统计示例

迁移成功后，你会看到类似的输出：

```
🚀 开始数据迁移：一对多 -> 多对多

📖 步骤 1: 读取现有电影数据...
   找到 150 条电影记录

🔍 步骤 2: 分析和合并重复电影...
   发现 100 个唯一番号
   - 番号 ABC-123: 2 条记录将被合并
   - 番号 DEF-456: 3 条记录将被合并
   共有 20 个番号存在重复

💾 步骤 3: 创建数据备份...
   ✅ 数据已备份到 Movie_backup 表

🔨 步骤 4: 创建 SubscribeMovie 中间表...
   ✅ 中间表已创建

⚙️  步骤 5: 迁移数据到新结构...
   处理进度: 10/100
   处理进度: 20/100
   ...
   ✅ 已处理 100 个唯一电影
   ✅ 已创建 150 个订阅关系

🔧 步骤 6: 更新表结构...
   ✅ 已删除旧的外键约束
   ✅ 已删除旧的唯一约束
   ✅ 已删除旧的索引
   ✅ 已删除 subscribeId 列
   ✅ 已为 number 添加唯一约束
   ✅ 已为中间表添加唯一约束
   ✅ 已为中间表添加索引
   ✅ 已为中间表添加外键约束

✅ 步骤 7: 验证迁移结果...
   电影记录数: 100
   关系记录数: 150

🎉 数据迁移完成！
```

