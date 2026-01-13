import { NextResponse } from 'next/server';
import { z } from 'zod';

// Zod Schema 保持不变
const connectionSchema = z.object({
  protocol: z.enum(['http', 'https']),
  address: z.string().min(1),
  port: z.coerce.number().min(1),
  path: z.string().optional(),
  username: z.string().min(1, '用户名是测试连接所必需的'),
  password: z.string().optional().default(''),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = connectionSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ success: false, message: parsedBody.error.issues[0].message }, { status: 400 });
    }

    const { protocol, address, port, path, username, password } = parsedBody.data;

    const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    const baseUrl = `${protocol}://${address}:${port}${cleanPath}`;
    
    // 创建一个 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 秒总超时

    // --- 第一步：尝试登录并获取 Token ---
    const authUrl = `${baseUrl}/Users/AuthenticateByName`;
    const authHeaders = {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': 'MediaBrowser Client="Next.js App", Device="Settings Page", DeviceId="test-connection-device", Version="1.0.0"'
    };
    const authPayload = { Username: username, Pw: password };

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(authPayload),
      signal: controller.signal,
    });

    if (!authResponse.ok) {
        clearTimeout(timeoutId); // 清除超时
        let errorMsg = `认证失败: 服务器返回状态 ${authResponse.status}`;
        try { const errorText = await authResponse.text(); if(errorText) errorMsg = `认证失败: ${errorText}`; } catch {}
        return NextResponse.json({ success: false, message: errorMsg }, { status: 401 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.AccessToken;
    const userName = authData.User?.Name;

    if (!accessToken || !userName) {
        clearTimeout(timeoutId);
        return NextResponse.json({ success: false, message: '认证失败: 未能从服务器获取有效的 Access Token 或用户名' }, { status: 400 });
    }
    
    // --- 第二步：使用 Token 获取系统信息 (包括 ServerName) ---
    const systemInfoUrl = `${baseUrl}/System/Info`;
    const infoHeaders = {
        'Accept': 'application/json',
        // 使用标准的 Authorization Bearer Token 格式
        'Authorization': `MediaBrowser Token="${accessToken}"`
    };

    const infoResponse = await fetch(systemInfoUrl, {
        method: 'GET',
        headers: infoHeaders,
        signal: controller.signal, // 复用同一个超时控制器
    });
    
    clearTimeout(timeoutId); // 所有网络请求完成，清除超时

    if (!infoResponse.ok) {
        // 即使认证成功，这一步也可能失败（例如权限问题），但不应阻止用户
        // 我们可以优雅地降级，只返回认证成功的消息
        return NextResponse.json({
            success: true,
            message: `连接成功！已作为用户 '${userName}' 登录。(但获取服务器名称失败)`,
            serverName: null, // 明确告知前端没有获取到名称
        });
    }

    const systemInfo = await infoResponse.json();
    const serverName = systemInfo.ServerName || 'Unknown Server';

    return NextResponse.json({
      success: true,
      message: `连接成功！已作为用户 '${userName}' 登录。`,
      serverName: serverName, // 将服务器名称返回给前端
    });

  } catch (error: any) {
    let errorMessage = '连接失败: 未知错误';
    if (error.name === 'AbortError') {
      errorMessage = '连接失败: 请求超时 (8秒)';
    } else if (error.cause) {
        // @ts-ignore
        errorMessage = `连接失败: 无法访问服务器地址。请检查地址、端口和网络设置。 (${error.cause.code || error.message})`;
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}