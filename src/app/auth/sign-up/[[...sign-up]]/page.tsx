import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import SignUpViewPage from '@/features/auth/components/sign-up-view';

export const metadata: Metadata = {
  title: 'Authentication | Sign Up',
  description: 'Sign Up page for authentication.'
};

export default async function Page() {
  // 检查用户是否已登录
  const session = await auth();
  if (session?.user?.id) {
    redirect('/dashboard/overview');
  }

  // 检查是否已有用户存在（单用户应用限制）
  const userCount = await db.user.count();
  if (userCount > 0) {
    // 如果已有用户，重定向到登录页面
    redirect('/auth/sign-in');
  }

  let stars = 3000; // Default value

  try {
    const response = await fetch(
      'https://api.github.com/repos/kiranism/next-shadcn-dashboard-starter',
      {
        next: { revalidate: 86400 }
      }
    );

    if (response.ok) {
      const data = await response.json();
      stars = data.stargazers_count || stars; // Update stars if API response is valid
    }
  } catch (error) {
    // Error fetching GitHub stars, using default value
  }
  
  return <SignUpViewPage stars={stars} />;
}
