import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  return settings;
}
export enum SettingKey {
  DirectoryConfig = 'downloadDirectoryConfig',
  MovieParseConfig = 'scraperRuleConfig',
  MediaServerConfig = 'mediaServerConfig',
  AiProviderConfig = 'aiProviderConfig',
  PushNotificationConfig = 'pushNotificationConfig',
  DownloadRuleConfig = 'downloadRuleConfig',
  DownloaderSettings = 'downloaderSettings',
  TelegramConfig = 'telegramConfig',
  ForumCookie = 'forumCookie',
  ProxyConfig = 'proxyConfig'
}

/**
 * Paso 2: Crear un mapa de tipos que asocie cada clave del Enum
 * con su interfaz de datos correspondiente.
 */
interface SettingTypeMap {
  [SettingKey.DirectoryConfig]: DirectoryConfigData;
  [SettingKey.MovieParseConfig]: MovieParseConfig;
  [SettingKey.MediaServerConfig]: MediaServerConfig;
  [SettingKey.AiProviderConfig]: AiProviderConfig;
  [SettingKey.PushNotificationConfig]: PushNotificationConfig;
  [SettingKey.DownloadRuleConfig]: DownloadRuleConfig;
  [SettingKey.DownloaderSettings]: DownloaderSettingsData;
  [SettingKey.TelegramConfig]: TelegramConfig;
  [SettingKey.ForumCookie]: ForumCookie;
  [SettingKey.ProxyConfig]: ProxyConfig;
}

interface GetSettingParams {
  key: string;
}

export async function getSetting<K extends SettingKey>(
  key: K
): Promise<SettingTypeMap[K] | null> {
  const setting = await prisma.setting.findUnique({
    where: { key }
  });

  if (!setting || !setting.value) {
    return null;
  }
  return setting.value as unknown as SettingTypeMap[K];
}

export async function getMovieDownloadDirectoryConfig(): Promise<DirectoryConfigData | null> {
  return await getDownloadDirectoryConfigByType('movie');
}
export async function getMagnetDownloadDirectoryConfig(): Promise<DirectoryConfigData | null> {
  return await getDownloadDirectoryConfigByType('magnet');
}
export async function getTelegramDownloadDirectoryConfig(): Promise<DirectoryConfigData | null> {
  return await getDownloadDirectoryConfigByType('telegram');
}
async function getDownloadDirectoryConfigByType(
  type: string
): Promise<DirectoryConfigData | null> {
  const setting = await getSetting(SettingKey.DirectoryConfig);
  if (!setting) return null;

  const obj = setting as any;

  for (const key in obj) {
    if (obj[key] && obj[key].mediaType === type) {
      return obj[key];
    }
  }
  return null;
}
export async function upsertSetting(key: SettingKey, value: any) {
  const res = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  return res.value as unknown as SettingTypeMap[SettingKey];
}

export async function allSettings() {
  return await prisma.setting.findMany();
}
export async function getCookieByWebsite(website: string) {
  const setting = await getSetting(SettingKey.ForumCookie);
  if (!setting) return null;
  const obj = setting as any;
  return obj[website];
  // return null;
}

export async function getProxyUrl() {
  const setting = await getSetting(SettingKey.ProxyConfig);
  if (!setting) return null;
  return setting;
}
