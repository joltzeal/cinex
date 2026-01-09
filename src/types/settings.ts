interface DirectoryConfigData {
  mediaType: 'movie' | 'magnet' | 'telegram';
  downloadDir: string;
  mediaLibraryDir: string;
  organizeMethod: 'hardlink' | 'move' | 'copy' | 'softlink';
  smartRename: boolean;
  scrapeMetadata: boolean;
  sendNotification: boolean;
}

interface MovieParseConfig {
  enableAiTranslation: boolean;
  fileNamingRule: string;
  directoryRule: string;
  nfoTitleRule: string;
  downloadFanart: boolean;
  watermarkTypes: string[];
  cleanupExtensions: string;
  cleanupFilenameContains: string;
  cleanupMinFileSize: number;
}

interface MediaServerConfig {
  type: 'jellyfin' | 'emby';
  name: string;
  protocol: 'http' | 'https';
  address: string;
  port: number;
  username: string;
  password: string;
  path: string;
  publicAddress: string;
}

interface PushNotificationConfig {
  domain: string;
  username: string;
  token?: string;
}

interface AiProviderConfig {
  baseURL: string;
  apiKey: string;
  modelName: string;
}

/**
 * 下载器设置数据结构
 * @example
 * {
 *   qbittorrent: {
 *     host: "192.168.0.79",
 *     port: 8095,
 *     enabled: true,
 *     password: "your_password",
 *     username: "admin",
 *     isDefault: true
 *   }
 * }
 */
interface DownloaderSettingsData {
  qbittorrent?: DownloaderSettingValue;
  transmission?: DownloaderSettingValue;
}
interface DownloaderSettingValue {
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
  isDefault?: boolean;
}
interface DownloadRuleConfig {
  //{"onlyHD": true, "downloadVR": false, "onlySingleMovie": true, "checkForDuplicates": true, "onlyChineseSubtitles": true, "downloadMagnetImmediately": false}
  onlyHD: boolean;
  downloadVR: boolean;
  onlySingleMovie: boolean;
  checkForDuplicates: boolean;
  onlyChineseSubtitles: boolean;
  downloadMagnetImmediately: boolean;
}

interface TelegramConfig {
  enabled: boolean;
  apiId: string;
  apiHash: string;
  botToken: string;
  session: string;
}
interface ForumCookie {
  javbus?: string;
  southplus?: string;
}

interface ProxyConfig {
  proxyUrl: string;
}
