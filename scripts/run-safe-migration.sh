#!/bin/bash

# 安全的数据库迁移脚本 - 导出、迁移、导入完整流程
# 用法: ./scripts/run-safe-migration.sh

set -e  # 遇到错误时退出

echo "🚀 开始安全迁移流程（导出 → 迁移 → 导入）"
echo "================================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 确认操作
echo -e "${YELLOW}⚠️  警告: 此操作将修改数据库结构${NC}"
echo ""
echo "此脚本将执行以下操作："
echo "  1. 导出当前 Subscribe 和 Movie 数据到 CSV"
echo "  2. 运行 Prisma 迁移创建新表结构"
echo "  3. 从 CSV 导入数据到新结构"
echo "  4. 验证迁移结果"
echo ""
echo "请确保你已经："
echo "  ✓ 备份了数据库（强烈推荐！）"
echo "  ✓ 更新了 prisma/schema.prisma 为新的多对多结构"
echo "  ✓ 没有正在运行的应用程序"
echo ""
read -p "是否继续? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ 已取消迁移${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 2. 导出现有数据
echo -e "${BLUE}📦 步骤 1/5: 导出现有数据到 CSV...${NC}"
echo ""
if pnpm run export:data; then
    echo ""
    echo -e "${GREEN}✅ 数据导出完成${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据导出失败${NC}"
    echo "请检查错误信息并修复后重试"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 3. 提示用户确认导出文件
echo -e "${YELLOW}📋 请检查导出的文件是否正确${NC}"
echo ""
echo "导出文件位置: prisma/export/"
ls -lh prisma/export/ || true
echo ""
read -p "导出文件是否正确? (yes/no): " confirm_export

if [ "$confirm_export" != "yes" ]; then
    echo -e "${RED}❌ 已取消迁移${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 4. 运行 Prisma 迁移
echo -e "${BLUE}🔧 步骤 2/5: 运行 Prisma 迁移...${NC}"
echo ""
echo "这将创建新的表结构（多对多关系）"
echo ""
read -p "开始运行迁移? (yes/no): " confirm_migrate

if [ "$confirm_migrate" != "yes" ]; then
    echo -e "${RED}❌ 已取消迁移${NC}"
    exit 1
fi

if npx prisma migrate dev --name change_to_many_to_many; then
    echo ""
    echo -e "${GREEN}✅ Prisma 迁移完成${NC}"
else
    echo ""
    echo -e "${RED}❌ Prisma 迁移失败${NC}"
    echo "数据已导出到 CSV，可以稍后手动恢复"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 5. 重新生成 Prisma Client
echo -e "${BLUE}🔧 步骤 3/5: 重新生成 Prisma Client...${NC}"
echo ""
if npx prisma generate; then
    echo ""
    echo -e "${GREEN}✅ Prisma Client 已生成${NC}"
else
    echo ""
    echo -e "${RED}❌ Prisma Client 生成失败${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 6. 导入数据
echo -e "${BLUE}📥 步骤 4/5: 从 CSV 导入数据...${NC}"
echo ""
if pnpm run import:data; then
    echo ""
    echo -e "${GREEN}✅ 数据导入完成${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据导入失败${NC}"
    echo "请检查错误信息"
    echo "CSV 文件保存在 prisma/export/ 可以重新尝试导入"
    exit 1
fi

echo ""
echo "================================================"
echo ""

# 7. 验证迁移结果
echo -e "${BLUE}🔍 步骤 5/5: 验证迁移结果...${NC}"
echo ""
if pnpm run verify:migration; then
    echo ""
    echo -e "${GREEN}✅ 验证通过${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  验证发现一些问题，请检查上面的输出${NC}"
fi

echo ""
echo "================================================"
echo ""

# 8. 完成提示
echo -e "${GREEN}🎉 安全迁移流程完成！${NC}"
echo ""
echo "📊 迁移总结:"
echo "  ✅ 数据已导出到 CSV (prisma/export/)"
echo "  ✅ 数据库结构已更新为多对多关系"
echo "  ✅ 数据已从 CSV 导入到新结构"
echo "  ✅ Prisma Client 已重新生成"
echo ""
echo "🔍 后续步骤:"
echo "  1. 测试应用程序: pnpm dev"
echo "  2. 检查功能是否正常"
echo "  3. 确认无误后，CSV 备份文件可保留或删除"
echo ""
echo "📁 备份文件位置: prisma/export/"
echo ""
echo "如需回滚，可以使用导出的 CSV 文件恢复数据"
echo ""

exit 0

