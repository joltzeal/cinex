interface DirectoryConfigData {
  mediaType: 'movie' | 'magnet' | 'telegram';
  downloadDir: string;
  mediaLibraryDir: string;
  organizeMethod: 'hardlink' | 'move' | 'copy'|'softlink';
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