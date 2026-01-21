import { prisma } from '@/lib/prisma';
import { TelegramMessageData } from '@/types/telegram';
import { SettingKey } from '../settings';
import { ProxyInterface } from 'telegram/network/connection/TCPMTProxy';

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: SettingKey.TelegramConfig }
  });
  return setting?.value as TelegramConfig | null;
}

export async function saveTelegramSession(
  sessionString: string
): Promise<void> {
  try {
    const currentSettings = await prisma.setting.findUnique({
      where: { key: SettingKey.TelegramConfig }
    });

    if (currentSettings) {
      const newSettingsValue = {
        ...(currentSettings.value as object),
        session: sessionString
      };
      await prisma.setting.update({
        where: { key: SettingKey.TelegramConfig },
        data: { value: newSettingsValue }
      });
      console.log('✅ Session has been saved to the database.');
    }
  } catch (error) {
    console.error('❌ Failed to save session to the database:', error);
  }
}

export async function getDownloadDirectory(): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SettingKey.DirectoryConfig }
    });

    if (!setting || !setting.value) {
      console.log('❌ Download directory configuration not found.');
      return null;
    }

    const configValue = setting.value as Record<string, any>;
    for (const key in configValue) {
      if (configValue[key]?.mediaType === 'telegram') {
        return configValue[key].downloadDir;
      }
    }

    console.log('❌ Telegram download directory configuration not found.');
    return null;
  } catch (error) {
    console.error('❌ Failed to get download directory config:', error);
    return null;
  }
}

export async function getPorxy()  {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SettingKey.ProxyConfig }
    });

    if (!setting || !setting.value) {
      console.log('❌ Download directory configuration not found.');
      return undefined;
    }
    const proxy = setting.value as ProxyConfig;
    const proxyUrl = new URL(proxy.proxyUrl);
    return {
      ip: proxyUrl.hostname,
      port: parseInt(proxyUrl.port, 10),
      socksType: 5,
      timeout: 10
    } as ProxyInterface;


  } catch (error) {
    console.error('❌ Failed to get download directory config:', error);
    return undefined;
  }
}

export async function saveTelegramMessage(
  data: TelegramMessageData
): Promise<void> {
  try {
    await prisma.telegramMessage.create({
      data: { ...data, processed: true }
    });
    console.log(
      `💾 Message saved to database: ${data.messageId} (${data.filePath.length} files)`
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint failed
      console.warn(`⚠️ Message already exists in database: ${data.messageId}`);
    } else {
      console.error('❌ Failed to save message to database:', error);
    }
  }
}
