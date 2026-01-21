'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { qBittorrentClient } from '@/features/download/downloader/qbittorrent';
import { TransmissionClient } from '@/features/download/downloader/transmission';
import { getSetting, SettingKey, upsertSetting } from '@/services/settings';


export type DownloaderName = 'qbittorrent' | 'transmission';
export type DownloaderConfig = {
  name: DownloaderName;
} & DownloaderSettingValue;



// --- Zod Schema ---
const settingsSchema = z.object({
  name: z.enum(['qbittorrent', 'transmission']),
  enabled: z.preprocess((val) => val === 'on', z.boolean()),
  host: z.string().optional().nullable(),
  port: z.coerce.number().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional(),
  isDefault: z.preprocess((val) => val === 'on', z.boolean()),
});


export async function getDownloaderSettings(): Promise<DownloaderConfig[]> {
  const names: DownloaderName[] = ['qbittorrent', 'transmission'];
  
  const settingsData = await getSetting(SettingKey.DownloaderSettings);

  return names.map(name => {
    const value = settingsData?.[name];

    return {
      name,
      enabled: value?.enabled ?? false,
      host: value?.host ?? null,
      port: value?.port ?? null,
      username: value?.username ?? null,
      password: value?.password ?? null,
      isDefault: value?.isDefault ?? false,
    };
  });
}

export async function getDefaultDownloader(): Promise<DownloaderConfig | null> {
  const settings = await getDownloaderSettings();
  return settings.find(s => s.isDefault && s.enabled) || null;
}

export async function testDownloaderConnection(name: DownloaderName) {
  const settingsData = await getSetting(SettingKey.DownloaderSettings);
  const value = settingsData?.[name];

  if (!value || !value.host) {
    return { success: false, message: '配置不完整，缺少主机地址。' };
  }

  const config: DownloaderConfig = { name, ...value };

  try {
    let client;
    if (name === 'qbittorrent') {
      client = new qBittorrentClient(config);
    } else if (name === 'transmission') {
      client = new TransmissionClient(config);
    } else {
      throw new Error('不支持的下载器');
    }
    return await client.testConnection();
  } catch (error: any) {
    return { success: false, message: `客户端初始化失败: ${error.message}` };
  }
}

export async function updateDownloaderSetting(
  prevState: { message: string },
  formData: FormData
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = settingsSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.issues.map(e => e.message).join(', ');
    return { message: `表单验证失败: ${errorMessages}` };
  }

  const { name, ...data } = validatedFields.data;

  try {
    // 获取现有的下载器设置
    const existingSetting = await getSetting(SettingKey.DownloaderSettings);

    const existingSettingsData = existingSetting as DownloaderSettingsData | undefined || {};
    const existingValue = existingSettingsData[name];

    const passwordToSave = (data.password === '' && existingValue?.password)
      ? existingValue.password
      : (data.password || '');

    const valueToSave: DownloaderSettingValue = {
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      username: data.username,
      password: passwordToSave,
      isDefault: data.isDefault
    };

    // 如果设置为默认，需要将其他下载器的 isDefault 设为 false
    const updatedSettingsData: DownloaderSettingsData = { ...existingSettingsData };
    
    if (data.isDefault) {
      // 将其他下载器的 isDefault 设为 false
      const otherDownloaders: DownloaderName[] = ['qbittorrent', 'transmission'];
      otherDownloaders.forEach(downloaderName => {
        if (downloaderName !== name && updatedSettingsData[downloaderName]) {
          updatedSettingsData[downloaderName]!.isDefault = false;
        }
      });
    }

    // 更新当前下载器的设置
    updatedSettingsData[name] = valueToSave;
    await upsertSetting(SettingKey.DownloaderSettings, updatedSettingsData);

    revalidatePath('/dashboard/settings');

    return { message: `成功保存 ${name} 设置。` };

  } catch (error) {
    console.error("Failed to upsert downloader setting:", error);
    return { message: '保存失败，数据库发生错误。' };
  }
}

export async function toggleDownloaderEnabled(name: DownloaderName, enabled: boolean) {
  try {
    // 获取现有的下载器设置
    const existingSetting = await getSetting(SettingKey.DownloaderSettings);


    const existingSettingsData = existingSetting as DownloaderSettingsData | undefined || {};
    
    if (!existingSettingsData[name]) {
      return { success: false, message: '配置不存在，无法直接切换。请先配置下载器。' };
    }

    // 更新指定下载器的启用状态
    const updatedSettingsData: DownloaderSettingsData = { ...existingSettingsData };
    updatedSettingsData[name] = {
      ...updatedSettingsData[name]!,
      enabled
    };
    await upsertSetting(SettingKey.DownloaderSettings, updatedSettingsData);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: '状态切换失败' };
  }
}