import { redirect } from 'next/navigation';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';
import { createAuthMiddleware, APIError } from 'better-auth/api';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true
    }
  },
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: [
    'chrome-extension://*',
    'moz-extension://*'
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 只拦截注册请求
      if (ctx.path !== '/sign-up/email') {
        return;
      }

      // 检查系统是否已有用户
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        throw new APIError('FORBIDDEN', {
          message: '系统已有用户注册，不允许创建新用户'
        });
      }
    })
  }
});
