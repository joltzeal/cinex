import { AuthView } from '@daveyplate/better-auth-ui';
import { authViewPaths } from '@daveyplate/better-auth-ui/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';
import { InteractiveGridPattern } from '@/features/auth/components/interactive-grid';

export const dynamicParams = false;
export const metadata: Metadata = {
  title: 'Authentication | Sign In',
  description: 'Sign In page for authentication.'
};

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className='relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <Link
        href='/examples/authentication'
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 right-4 hidden md:top-8 md:right-8'
        )}
      >
        Sign Up
      </Link>
      <div className='bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <img src="/icon.png" alt="" className='mr-2 h-6 w-6'/>
          {/* <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg> */}
          Cinex
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;Choose your hard: The hardship of discipline or the hardship of failure.&rdquo;
            </p>
            <footer className='text-sm'>Cinex</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <AuthView path={path} callbackURL='/dashboard' localization={{
            SIGN_IN: '登录',
            SIGN_IN_ACTION:"登录",
            NAME_PLACEHOLDER:"cinex",
            EMAIL_PLACEHOLDER:"cinex@example.com",
            PASSWORD_PLACEHOLDER:"输入你的密码",
            SIGN_UP: '注册',
            SIGN_UP_ACTION: '注册',
            IS_REQUIRED: '必填',
            IS_INVALID: '无效',
            INVALID_EMAIL_OR_PASSWORD: '邮箱或密码无效',
            FORGOT_PASSWORD_LINK: '忘记密码？',
            ALREADY_HAVE_AN_ACCOUNT: '已有账号？',
            FORGOT_PASSWORD: '忘记密码？',
            FORGOT_PASSWORD_DESCRIPTION: '忘记密码？请输入您的邮箱地址，我们将发送一封重置密码的邮件给您。',
            NAME:"用户名",
            SIGN_IN_USERNAME_DESCRIPTION: '请输入您的用户名',
            SIGN_UP_DESCRIPTION:"创建您的账号",
            EMAIL: '邮箱',
            PASSWORD: '密码',
            SIGN_IN_DESCRIPTION: '使用您的邮箱和密码登录',
            DONT_HAVE_AN_ACCOUNT: '没有账号？',

          }}/>
        </div>
      </div>
    </div>
  );
}
