import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
// 初始化 Prisma Client
const prisma = new PrismaClient();
// 定义你的默认设置
// 将所有需要初始化的默认配置都放在这个数组里
const defaultSettings = [
  {
    key: 'downloadRuleConfig',
    value: {
      onlyChineseSubtitles: true,
      onlyHD: true,
      checkForDuplicates: true,
      onlySingleMovie: true
    },
    description: '全局下载规则'
  },
  // 在这里添加更多你需要的默认设置...
];
async function main() {
  console.log('开始播种(Seeding)...');
  const adminEmail = 'admin@admin.com'; // 您可以自定义邮箱
  const plainPassword = 'admin123456';
  const hashedPassword = await hash(plainPassword, 12);

  console.log('开始填充数据...');

  // 2. 使用 upsert 避免重复创建用户
  // upsert 会尝试查找记录，如果找不到，则创建一个新记录。
  const admin = await prisma.user.upsert({
    where: { email: adminEmail }, // 用于查找用户的唯一条件
    update: {}, // 如果用户已存在，我们不做任何更新
    create: {
      email: adminEmail,
      name: 'Admin',
      password: hashedPassword,
      image: 'https://github.com/shadcn.png',
      // hashedPassword: hashedPassword,
    },
  });

  console.log(`管理员用户 ${admin.email} 已创建或已存在。`);
  // 使用循环和 upsert 来创建或更新每一条默认设置
  // upsert 是一个非常安全的操作：
  // - 如果 where 条件（即 key）找到了记录，它会执行 update。
  // - 如果没找到，它会执行 create。
  // 这确保了脚本可以重复运行而不会出错。
  for (const setting of defaultSettings) {
    const { key, value, description } = setting;
    await prisma.setting.upsert({
      where: { key },
      update: {}, // 如果找到了，我们什么也不做，保持现有值
      create: {
        key,
        value,
      },
    });
    console.log(`已确保设置 '${key}'(${description}) 存在。`);
  }
  console.log('播种完成。');
}
// 执行主函数并处理可能的错误
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // 关闭 Prisma Client 连接
    await prisma.$disconnect();
  });