#!/bin/bash

# 数据库迁移脚本 - 一键执行完整迁移流程
# 用法: ./scripts/run-full-migration.sh

set -e  # 遇到错误时退出

echo "🚀 开始完整的数据库迁移流程"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 确认操作
echo -e "${YELLOW}⚠️  警告: 此操作将修改数据库结构${NC}"
echo "请确保你已经："
echo "  ✓ 备份了数据库"
echo "  ✓ 阅读了迁移文档"
echo ""
read -p "是否继续? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ 已取消迁移${NC}"
    exit 1
fi

echo ""
echo "================================"
echo ""

# 2. 运行迁移脚本
echo -e "${GREEN}📝 步骤 1/3: 执行数据迁移...${NC}"
echo ""
if pnpm run migrate:many-to-many; then
    echo ""
    echo -e "${GREEN}✅ 数据迁移完成${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据迁移失败，请检查错误信息${NC}"
    exit 1
fi

echo ""
echo "================================"
echo ""

# 3. 验证迁移结果
echo -e "${GREEN}🔍 步骤 2/3: 验证迁移结果...${NC}"
echo ""
if pnpm run verify:migration; then
    echo ""
    echo -e "${GREEN}✅ 验证通过${NC}"
else
    echo ""
    echo -e "${RED}❌ 验证失败，请检查问题${NC}"
    exit 1
fi

echo ""
echo "================================"
echo ""

# 4. 重新生成 Prisma Client
echo -e "${GREEN}🔧 步骤 3/3: 重新生成 Prisma Client...${NC}"
echo ""
if npx prisma generate; then
    echo ""
    echo -e "${GREEN}✅ Prisma Client 已更新${NC}"
else
    echo ""
    echo -e "${RED}❌ Prisma Client 生成失败${NC}"
    exit 1
fi

echo ""
echo "================================"
echo ""

# 5. 完成提示
echo -e "${GREEN}🎉 迁移成功完成！${NC}"
echo ""
echo "后续步骤："
echo "  1. 测试应用程序: pnpm dev"
echo "  2. 检查功能是否正常"
echo "  3. 确认无误后删除备份表:"
echo "     psql -d your_database -c 'DROP TABLE \"Movie_backup\"'"
echo ""
echo "如需查看详细文档，请参考:"
echo "  - scripts/MIGRATION_GUIDE.md"
echo "  - scripts/README.md"
echo ""

exit 0

