export { auth as middleware } from "@/auth"


// // import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
// import { NextRequest, NextResponse } from 'next/server';
// // import { auth } from './auth';

// // const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

// // export default auth(async (req: NextRequest) => {
// //   // if (isProtectedRoute(req)) await auth.protect();
// // });
// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
//     // Always run for API routes
//     '/(api|trpc)(.*)'
//   ]
// };
// export async function middleware(req: NextRequest) {
//   try {
//     // 如果 auth 是对象并有 protect 方法：
//     // if (typeof auth?.protect === 'function') {
//     //   // 注意：根据 auth.protect 的实现传参或使用 await/不 await
//     //   await auth.protect(req);
//     // }

//     // 或者，如果 auth 是高阶函数，先生成 handler 再执行：
//     // if (typeof auth === 'function') {
//     //   const handler = auth(async (r: NextRequest) => { /* your logic */ });
//     //   return handler(req);
//     // }

//     return NextResponse.next();
//   } catch (err) {
//     console.error('middleware auth error', err);
//     const url = req.nextUrl.clone();
//     url.pathname = '/auth/sign-in';
//     return NextResponse.redirect(url);
//   }
// }
