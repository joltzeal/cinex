// src/lib/jellyfin-client.ts

// Jellyfin 配置接口
export interface JellyfinConfig {
  name?: string;
  address: string;
  port: number;
  type: 'jellyfin' | 'emby';
  protocol: 'http' | 'https';
  username: string;
  password?: string;
  apiKey?: string; // 推荐使用 API Key
}

// Jellyfin 媒体项的简化接口
export interface JellyfinMediaItem {
  Id: string;
  Name: string; // 主标题
  OriginalTitle?: string; // 原标题
  SortName?: string; // 排序标题
  ServerId: string;
  Type: 'Movie' | 'Episode' | 'Series' | 'Folder' | 'Video' | 'BoxSet';
  Path?: string;
  ProviderIds?: { [key: string]: string }; // 例如 { "Imdb": "tt1234567", "Tmdb": "123" }
  PremiereDate?: string; // 首映日期 (ISO 8601 格式)
  ProductionYear?: number; // 出品年份
  CommunityRating?: number; // 社区评分 (满分 10)
  OfficialRating?: string; // 官方评级 (例如 "R", "PG-13")
  Overview?: string; // 剧情简介
}

export class JellyfinClient {
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private userId: string | null = null;
  private readonly deviceId = 'NextJS-Javbus-Subscriber-v1'; // 自定义设备ID

  constructor(private config: JellyfinConfig) {
    this.baseUrl = `${config.protocol}://${config.address}:${config.port}`;
  }

  /**
   * 使用用户名和密码进行认证，获取 Access Token 和 User ID
   */
  private async authenticate(): Promise<void> {
    if (this.accessToken) return; // 如果已经认证，则跳过

    console.log(`[Jellyfin] Authenticating user: ${this.config.username}...`);

    const authUrl = `${this.baseUrl}/Users/AuthenticateByName`;
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Jellyfin API 需要这个 X-Emby-Authorization 头
        'X-Emby-Authorization': `Emby Client="Next.js App", Device="Javbus Subscriber", DeviceId="${this.deviceId}", Version="1.0.0"`
      },
      body: JSON.stringify({
        Username: this.config.username,
        Pw: this.config.password || ''
      })
    });

    if (!response.ok) {
      throw new Error(
        `Jellyfin authentication failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    this.accessToken = data.AccessToken;
    this.userId = data.User.Id;

    console.log(
      `[Jellyfin] Authentication successful. User ID: ${this.userId}`
    );
  }

  /**
   * 构造包含认证信息的请求头
   */
  private getAuthHeaders(): HeadersInit {
    if (!this.accessToken) {
      throw new Error(
        'Client is not authenticated. Call authenticate() first.'
      );
    }

    const token = `MediaBrowser Token="${this.accessToken}"`;
    return {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': `Emby Client="Next.js App", Device="Javbus Subscriber", DeviceId="${this.deviceId}", Version="1.0.0", Token="${this.accessToken}"`
    };
  }

  /**
   * 获取指定用户的所有媒体库（根文件夹）
   */
  public async getMediaLibraries(): Promise<JellyfinMediaItem[]> {
    await this.authenticate();
    if (!this.userId) throw new Error('User ID not available.');

    const url = `${this.baseUrl}/Users/${this.userId}/Views`;
    const response = await fetch(url, { headers: this.getAuthHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to fetch media libraries: ${response.status}`);
    }

    const data = await response.json();
    return data.Items;
  }

  /**
   * 递归获取指定文件夹下的所有媒体项（电影和剧集）
   * @param parentId - 父文件夹的 ID
   * @returns 媒体项数组
   */
  public async getAllItemsRecursive(
    parentId: string
  ): Promise<JellyfinMediaItem[]> {
    await this.authenticate();
    if (!this.userId) throw new Error('User ID not available.');

    // 🔥 2. 定义需要额外获取的元数据字段
    const extraFields = [
      'OriginalTitle',
      'SortName',
      'ProviderIds',
      'PremiereDate',
      'ProductionYear',
      'CommunityRating',
      'OfficialRating',
      'Overview',
      'Path' // 确保也请求了文件路径
    ].join(',');

    // 🔥 3. 将 Fields 参数添加到 API 请求的 URL 中
    const url = `${this.baseUrl}/Users/${this.userId}/Items?ParentId=${parentId}&Recursive=true&IncludeItemTypes=Movie,Video&Fields=${extraFields}`;

    console.log(
      `[Jellyfin] Fetching all items with extra fields from Parent ID: ${parentId}`
    );
    const response = await fetch(url, { headers: this.getAuthHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to fetch items: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `[Jellyfin] Fetched a total of ${data.Items.length} items with rich metadata.`
    );
    return data.Items;
  }
}
