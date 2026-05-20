export interface PushNotificationConfig {
  domain: string;
  token: string;
}

export interface PushMessageParams {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  render_mode?: 'code' | 'raw' | 'markdown';
  [key: string]: unknown;
}

export class PushNotificationService {
  private config: PushNotificationConfig;

  constructor(config: PushNotificationConfig) {
    this.config = config;
  }

  /**
   * 发送推送消息
   */
  async sendMessage(params: PushMessageParams): Promise<{ success: boolean; message?: string; uuid?: string }> {
    try {
      const { domain, token } = this.config;
      const baseUrl = normalizePushDomain(domain);
      const url = `${baseUrl}/api/push/${encodeURIComponent(token)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatMarkdownMessage(params)),
        signal: AbortSignal.timeout(10000), // 10秒超时
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PushNotification] 推送服务返回错误: ${response.status} ${response.statusText} - ${errorText}`);
        return {
          success: false,
          message: `推送失败: ${response.status} ${response.statusText} - ${errorText}`
        };
      }

      const result = await parsePushResponse(response);
      if (!result || result.success !== false) {
        return {
          success: true,
          message: result?.message || '推送成功',
          uuid: result?.uuid
        };
      }

      return {
        success: false,
        message: `推送失败: ${result.message || '服务返回失败'}`
      };
    } catch (error) {
      console.error('[PushNotification] 推送消息时发生错误:', error);
      
      // 处理网络连接错误
      if (error instanceof Error) {
        if (error.message.includes('fetch failed') || error.message.includes('ECONNRESET')) {
          return {
            success: false,
            message: `推送失败: 无法连接到推送服务，请检查域名是否正确或网络连接是否正常`
          };
        }
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: `推送失败: 请求超时，请检查推送服务是否可用`
          };
        }
      }
      
      return {
        success: false,
        message: `推送失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 发送测试消息
   */
  async sendTestMessage(): Promise<{ success: boolean; message?: string }> {
    return this.sendMessage({
      title: '测试消息',
      description: `这是一条测试消息，发送时间: ${new Date().toLocaleString('zh-CN')}`,
    });
  }

  /**
   * 发送任务执行通知
   */
  async sendTaskNotification(taskName: string, status: 'success' | 'failed', details?: string): Promise<{ success: boolean; message?: string }> {
    const statusText = status === 'success' ? '成功' : '失败';
    
    return this.sendMessage({
      title: '任务执行通知',
      content: [
        `*任务名称*: ${taskName}`,
        `*执行状态*: ${statusText}`,
        `*执行时间*: ${new Date().toLocaleString('zh-CN')}`,
        details ? `\n*详细信息*:\n${details}` : ''
      ].filter(Boolean).join('\n'),
      render_mode: 'markdown',
    });
  }
}

function normalizePushDomain(domain: string) {
  const trimmed = domain.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

async function parsePushResponse(response: Response): Promise<{
  success?: boolean;
  message?: string;
  uuid?: string;
} | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatMarkdownMessage(params: PushMessageParams) {
  const sections = [
    params.title ? `*${params.title}*` : '',
    params.description || '',
    params.content || '',
    params.url ? `[查看详情](${params.url})` : ''
  ].filter(Boolean);

  return normalizeTelegramMarkdown(sections.join('\n\n'));
}

function normalizeTelegramMarkdown(message: string) {
  return message
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .trim();
}
