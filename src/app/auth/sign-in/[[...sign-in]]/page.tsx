import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import LoginPage from '@/features/auth/components/sign-in-view';

export const metadata: Metadata = {
  title: 'Authentication | Sign In',
  description: 'Sign In page for authentication.'
};

export default async function Page() {
  // 检查用户是否已登录
  const session = await auth();
  if (session?.user?.id) {
    redirect('/dashboard/overview');
  }

  // 检查是否存在用户，如果没有用户则重定向到注册页面
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect('/auth/sign-up');
  }
  
  return <LoginPage />;
}
