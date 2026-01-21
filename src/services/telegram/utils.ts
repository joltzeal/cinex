import type { Api } from 'telegram';
import { ProxyConfig } from '@/types/telegram';
import { logger } from '@/lib/logger';

export function getProxyConfigFromEnv(): ProxyConfig | undefined {
  const proxyEnv =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxyEnv) return undefined;
  try {
    const proxyUrl = new URL(proxyEnv);
    return {
      ip: proxyUrl.hostname,
      port: parseInt(proxyUrl.port, 10),
      socksType: 5,
      timeout: 10
    };
  } catch (error) {
    console.error(
      `❌ Invalid proxy URL: "${proxyEnv}". Ignoring proxy settings.`,
      error
    );
    return undefined;
  }
}

export function extractTagsAndTitle(text?: string | null): {
  tags: string[];
  title: string;
} {
  if (!text) return { tags: [], title: '' };
  const tags = (text.match(/#(\w+)/g) || []).map((tag) => tag.substring(1));
  const title = text.replace(/#(\w+)/g, '').trim();
  return { tags, title };
}

export function generateForwardUrl(forwardInfo?: any): string | null {
  if (!forwardInfo) return null;
  const username = forwardInfo.chat.username;
  const messageId = forwardInfo.originalFwd.channelPost;
  if (username && messageId) {
    return `https://t.me/${username}/${messageId}`;
  }
  return null;
}

export function cleanTextForDb(text?: string | null): string | null {
  if (!text) return null;
  return text.replace(/[\x00-\x1F\x7F-\x9F\uFFFD\u0000]/g, '').trim() || null;
}

export async function broadcastToSSE(message: object) {
  try {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/api/telegram/broadcast`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message, timestamp: new Date().toISOString() })
    });
    // console.log(`📡 Broadcast message sent: ${message.type}`);
  } catch (error: any) {
    if (error.cause?.code === 'ECONNREFUSED') {
      // Suppress error if the server is not ready, common during startup
    } else {
      console.error('❌ Failed to broadcast SSE message:', error.message);
    }
  }
}
