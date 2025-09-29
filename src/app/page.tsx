import { auth } from '@/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  // 获取当前会话
  const session = await auth();
  const userId = session?.user?.id;

  // 如果用户已登录，直接跳转到仪表板
  if (userId) {
    redirect('/dashboard/overview');
  }

  // 检查数据库中是否存在用户
  const userCount = await db.user.count();
  
  // 如果没有用户，跳转到注册页面
  if (userCount === 0) {
    redirect('/auth/sign-up');
  }
  
  // 如果有用户但当前未登录，跳转到登录页面
  redirect('/auth/sign-in');
}