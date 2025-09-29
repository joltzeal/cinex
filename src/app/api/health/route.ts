import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 这里可以添加数据库连接检查
    // const dbStatus = await checkDatabaseConnection();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      scheduler: process.env.ENABLE_SCHEDULER === 'true' ? 'enabled' : 'disabled'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
