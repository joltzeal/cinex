import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt", // 明确使用 JWT
  },
  trustHost: true, // 信任所有主机，解决 Docker 环境中的问题
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        // 1. 验证 credentials 是否存在且包含邮箱和密码
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 2. 在数据库中查找用户
        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        // 3. 如果找不到用户，或者用户没有设置密码，则认证失败
        if (!user || !user.password) {
          return null;
        }

        // 4. 使用 bcrypt 比较用户输入的密码和数据库中存储的哈希密码
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        // 5. 如果密码匹配，返回用户对象，认证成功
        if (isPasswordValid) {
          return user;
        }

        // 6. 如果密码不匹配，返回 null
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    // 2. Session 回调：从 token 中读取 ID，并添加到 session 对象
    async session({ session, token }) {
      
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // (可选) 自定义认证页面
  pages: {
    signIn: '/auth/sign-in', // 指定登录页面的路径
  },
})