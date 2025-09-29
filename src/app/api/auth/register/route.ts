import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 首先检查是否已经有用户存在（单用户应用限制）
    const userCount = await db.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: '系统已存在用户，不允许再次注册' },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    // 验证输入
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await db.user.create({
      data: {
        name,
        email,
        image: 'https://github.com/shadcn.png',
        password: hashedPassword,
      },
    });

    // 返回成功响应（不包含密码）
    return NextResponse.json({
      message: '注册成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
