import { db } from '@/lib/db';
import { z } from 'zod';
// Assuming you have a layout container like this from your original code
import SettingsPageClient from './settings-client-view';
import { getDownloaderSettings } from '@/lib/downloader';

// All your data fetching logic and Zod schemas remain here, unchanged.
const mediaServerConfigSchema = z.object({
  type: z.enum(['jellyfin', 'emby']),
  name: z.string().optional(),
  protocol: z.enum(['http', 'https']),
  address: z.string(),
  port: z.number(),
  username: z.string(),
  password: z.string().optional(),
  path: z.string().optional(),
});
const downloadRuleSchema = z.object({
  onlyChineseSubtitles: z.boolean(),
  onlyHD: z.boolean(),
  checkForDuplicates: z.boolean(),
});
async function getMediaServerConfig() {
  const setting = await db.setting.findUnique({ where: { key: 'mediaServerConfig' } });
  if (!setting) return null;
  const parseResult = mediaServerConfigSchema.safeParse(setting.value);
  if (parseResult.success) return parseResult.data;
  console.error("Failed to parse media server config from DB:", parseResult.error);
  return null;
}
// 删除原有的 getDownloaderSettings 函数，因为现在从 lib/downloader.ts 导入
const aiProviderConfigSchema = z.object({
  baseURL: z.string().url(),
  apiKey: z.string(),
  modelName: z.string(),
});

async function getAiProviderConfig() {
  const setting = await db.setting.findUnique({ where: { key: 'aiProviderConfig' } });
  if (!setting) return null;
  const parseResult = aiProviderConfigSchema.safeParse(setting.value);
  if (parseResult.success) return parseResult.data;
  console.error("Failed to parse AI provider config from DB:", parseResult.error);
  return null;
}

const pushNotificationConfigSchema = z.object({
  domain: z.string(),
  username: z.string(),
  token: z.string().optional(),
});

async function getPushNotificationConfig() {
  const setting = await db.setting.findUnique({ where: { key: 'pushNotificationConfig' } });
  if (!setting) return null;
  const parseResult = pushNotificationConfigSchema.safeParse(setting.value);
  if (parseResult.success) return parseResult.data;
  console.error("Failed to parse push notification config from DB:", parseResult.error);
  return null;
}
async function getDownloadRuleConfig() {
  const setting = await db.setting.findUnique({
    where: { key: 'downloadRuleConfig' },
  });
  if (!setting) return null; // 如果数据库没记录，返回 null

  // 安全地解析数据，如果格式不对，也返回 null
  const parseResult = downloadRuleSchema.safeParse(setting.value);
  if (parseResult.success) {
    return parseResult.data;
  }
  return null;
}
const downloadDirectoryConfigSchema = z.object({
  movie: z.string(),
  tv: z.string(),
  adult: z.string(),
  anime: z.string(),
});

async function getDownloadDirectoryConfig() {
  const setting = await db.setting.findUnique({ where: { key: 'downloadDirectoryConfig' } });
  if (!setting) return null;
  const parseResult = downloadDirectoryConfigSchema.safeParse(setting.value);
  if (parseResult.success) return parseResult.data;
  console.error("Failed to parse download directory config from DB:", parseResult.error);
  return null;
}

// This is the main Server Component
export default async function SettingsPage() {

  const settings = await db.setting.findMany({
    where: {
      key: {
        in: ['mediaServerConfig', 'aiProviderConfig', 'pushNotificationConfig', 'downloadDirectoryConfig', 'downloadRuleConfig', 'downloaderSettings', 'scraperRuleConfig']
      }
    }
  });

  return (
    <SettingsPageClient
      settings={settings}
    />
  );
}