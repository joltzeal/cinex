// lib/downloaders/qbittorrent.ts

// 【修改 1】移除旧的 Prisma 类型导入
// import { DownloaderSetting } from "@prisma/client";

// 【修改 2】导入新的、我们自己定义的配置类型
import { DownloaderConfig } from "@/lib/downloader";
import { logger } from "@/lib/logger";
import { DownloaderClient, DownloaderStats, Torrent, TorrentAddOptions, TorrentStatus } from "@/types/download";

export class qBittorrentClient implements DownloaderClient {
  private readonly baseUrl: string;
  private sid: string | null = null;

  // 【修改 3】将构造函数参数的类型从 DownloaderSetting 更改为 DownloaderConfig
  constructor(private settings: DownloaderConfig) {
    // ---- 从这里开始，下面的所有代码都无需任何修改 ----
    // 因为 DownloaderConfig 具有与旧类型完全相同的属性

    if (!this.settings.host || this.settings.host.trim() === '') {
      throw new Error("qBittorrent host is not configured.");
    }

    let fullHost = this.settings.host.trim();

    if (!fullHost.startsWith('http://') && !fullHost.startsWith('https://')) {
      fullHost = 'http://' + fullHost;
    }

    try {
      const url = new URL(fullHost);

      if (this.settings.port) {
        url.port = this.settings.port.toString();
      }

      this.baseUrl = url.origin;

    } catch (error) {
      logger.error(`Invalid host format provided:${this.settings.host}`,);
      throw new Error(`无效的主机格式: ${this.settings.host}`);
    }
  }

  private async login(): Promise<void> {
    if (this.sid) return;

    const body = new URLSearchParams();
    body.append('username', this.settings.username || '');
    body.append('password', this.settings.password || '');

    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`qBittorrent login failed. Status: ${response.status}. Response: ${errorText}`);
    }

    const cookie = response.headers.get('set-cookie');
    if (!cookie || !cookie.includes('SID=')) {
      throw new Error("Failed to get SID from qBittorrent. Check credentials.");
    }

    this.sid = cookie.split(';')[0];
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    await this.login();
    const headers = { ...options.headers, 'Cookie': this.sid! };
    return fetch(`${this.baseUrl}${path}`, { ...options, headers });
  }


  async addTorrent(url: string, options?: TorrentAddOptions): Promise<{ success: boolean; message: string }> {
    const body = new URLSearchParams();

    body.append('urls', url);

    if (options?.savepath) {
      body.append('savepath', options.savepath);
      logger.info(`[qBittorrent] Adding torrent ${url} with save path: ${options.savepath}`);
    } else {
      logger.info(`[qBittorrent] Adding torrent ${url} with default save path.`);
    }
    if (options?.category) {
      body.append('category', options.category);
    }
    if (options?.tags) {
      body.append('tags', options.tags.join(','));
    }

    const response = await this.request('/api/v2/torrents/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    const responseBodyText = await response.text();

    if (response.ok) {
      if (responseBodyText.trim().toLowerCase().includes('fail')) {
        return { success: false, message: `qBittorrent reported failure: ${responseBodyText}` };
      }
      return { success: true, message: "任务已成功添加到 qBittorrent。" };
    } else {
      return { success: false, message: `添加到 qBittorrent 失败 (状态码 ${response.status}): ${responseBodyText || '未知错误'}` };
    }
  }

  async getTorrents(): Promise<Torrent[]> {
    const response = await this.request('/api/v2/torrents/info');
    if (!response.ok) {
      throw new Error("Failed to fetch torrents from qBittorrent.");
    }
    const data: any[] = await response.json();
    return data.map(t => this.mapToUnifiedTorrent(t));
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.request('/api/v2/app/version');

      if (response.ok) {
        const version = await response.text();
        return { success: true, message: `连接成功！版本: ${version}` };
      }
      const errorText = await response.text();
      return { success: false, message: `连接失败，状态码: ${response.status}, 响应: ${errorText}` };
    } catch (error: any) {
      return { success: false, message: `连接出错: ${error.message}` };
    }
  }

  async getStats(): Promise<DownloaderStats> {
    try {
      const response = await this.request('/api/v2/transfer/info');
      if (!response.ok) {
        throw new Error("Failed to fetch transfer info from qBittorrent.");
      }
      const data: any = await response.json();
      
      return {
        downloadSpeed: data.dl_info_speed || 0,  // 当前下载速度 (bytes/s)
        uploadSpeed: data.up_info_speed || 0,     // 当前上传速度 (bytes/s)
        totalDownloaded: data.dl_info_data || 0,  // 总下载量 (bytes)
        totalUploaded: data.up_info_data || 0,    // 总上传量 (bytes)
      };
    } catch (error: any) {
      logger.error(`Failed to get qBittorrent stats: ${error.message}`);
      // 返回默认值
      return {
        downloadSpeed: 0,
        uploadSpeed: 0,
        totalDownloaded: 0,
        totalUploaded: 0,
      };
    }
  }

  private mapToUnifiedTorrent(t: any): Torrent {
    const statusMap: { [key: string]: TorrentStatus } = {
      downloading: 'downloading', stalledDL: 'stalled', metaDL: 'downloading',
      forcedDL: 'downloading', seeding: 'seeding', stalledUP: 'seeding',
      forcedUP: 'seeding', checkingUP: 'checking', checkingDL: 'checking',
      pausedDL: 'paused', pausedUP: 'paused', moving: 'checking',
      missingFiles: 'error', error: 'error',
    };

    return {
      id: t.hash,
      hash: t.hash,
      name: t.name,
      size: t.total_size,
      progress: t.progress * 100,
      status: statusMap[t.state] || 'paused',
      downloadSpeed: t.dlspeed,
      uploadSpeed: t.upspeed,
      eta: t.eta,
      addedOn: t.added_on,
      contentPath: t.content_path,
      savePath: t.save_path,
      rootPath: t.root_path,
    };
  }
}