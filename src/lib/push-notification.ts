export interface PushNotificationConfig {
  domain: string;
  username: string;
  token?: string;
}

export interface PushMessageParams {
  title?: string;
  description: string;
  content?: string;
  channel?: string;
  token?: string;
  url?: string;
  to?: string;
  async?: boolean;
  render_mode?: 'code' | 'raw' | 'markdown';
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
      const { domain, username } = this.config;
      const baseUrl = `https://${domain}/push/${username}`;

      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      
      if (params.title) queryParams.append('title', params.title);
      if (params.description) queryParams.append('description', params.description);
      if (params.content) queryParams.append('content', params.content);
      if (params.channel) queryParams.append('channel', params.channel);
      if (params.url) queryParams.append('url', params.url);
      if (params.to) queryParams.append('to', params.to);
      if (params.async) queryParams.append('async', params.async.toString());
      if (params.render_mode) queryParams.append('render_mode', params.render_mode);
      
      // 使用配置中的 token 或参数中的 token
      const token = params.token || this.config.token;
      if (token) {
        queryParams.append('token', token);
      }

      const url = `${baseUrl}?${queryParams.toString()}`;

      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token }),
        },
        // 添加超时设置
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

      const result = await response.json();
      if(result.success){
        return {
          success: true,
          message: '推送成功',
          uuid: result.uuid
        };
      }else{
        return {
          success: false,
          message: `推送失败: ${result.message}`
        };
      }
      
      
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
    const statusText = status === 'success' ? '✅ 成功' : '❌ 失败';
    const emoji = status === 'success' ? '🎉' : '⚠️';
    
    return this.sendMessage({
      title: `${emoji} 任务执行通知`,
      description: `${taskName} 执行${status === 'success' ? '成功' : '失败'}`,
      content: `## 任务执行结果\n\n**任务名称**: ${taskName}\n**执行状态**: ${statusText}\n**执行时间**: ${new Date().toLocaleString('zh-CN')}\n\n${details ? `**详细信息**:\n${details}` : ''}`,
    });
  }
}
