import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from './lib/prisma';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 排除静态资源和 API 路由
  // if (
  //   pathname.startsWith('/api/') ||
  //   pathname.startsWith('/_next/') ||
  //   pathname.startsWith('/auth/')
  // ) {
  //   return NextResponse.next()
  // }

  // try {
  //   // 检查是否有用户
  //   const userCount = await prisma.user.count()

  //   // 如果没有用户，重定向到注册页
  //   if (userCount === 0 && pathname !== '/auth/sign-up') {
  //     return NextResponse.redirect(new URL('/auth/sign-up', request.url))
  //   }

  //   // 如果访问 dashboard 路由，暂时放行（后续添加登录验证）
  //   if (pathname.startsWith('/dashboard')) {
  //     // TODO: 添加登录验证逻辑
  //     return NextResponse.next()
  //   }
  // } catch (error) {
  //   console.error('Proxy middleware error:', error)
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
