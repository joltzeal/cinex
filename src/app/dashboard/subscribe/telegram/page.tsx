import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { PrismaClient } from '@prisma/client';
import { TelegramManagement, TelegramSettings } from './management';


// It's good practice to have a single instance of Prisma Client
// You can place this in a lib file, e.g., 'src/lib/prisma.ts'
const prisma = new PrismaClient();
const TELEGRAM_CONFIG_KEY = 'telegramConfig';

// This function fetches the data on the server
async function getTelegramSettings(): Promise<TelegramSettings> {
  const setting = await prisma.setting.findUnique({
    where: { key: TELEGRAM_CONFIG_KEY },
  });

  if (setting && typeof setting.value === 'object' && setting.value !== null) {
    // Ensure the returned object matches the TelegramSettings interface
    const value = setting.value as any;
    return {
      enabled: value.enabled || false,
      apiId: value.apiId || '',
      apiHash: value.apiHash || '',
      botToken: value.botToken || '',
      session: value.session || '',
    };
  }

  // Return a default structure if no settings are found
  return {
    enabled: false,
    apiId: '',
    apiHash: '',
    botToken: '',
    session: '',
  };
}


export default async function HomePage() {
  // Fetch data directly on the server before rendering
  const initialSettings = await getTelegramSettings();

  return (
    <PageContainer scrollable={false}>
      <TelegramManagement initialSettings={initialSettings} />
    </PageContainer>
  );
}