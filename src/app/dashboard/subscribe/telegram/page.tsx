import PageContainer from '@/components/layout/page-container';
// import { TelegramManagement, TelegramSettings } from './management';
import { getSetting, SettingKey } from '@/services/settings';
import TelegramManagement from './management';

async function getTelegramSettings(): Promise<TelegramConfig> {

  const setting = await getSetting(SettingKey.TelegramConfig);

  if (setting ) {
    // Ensure the returned object matches the TelegramSettings interface
    const value = setting as any;
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


export default async function TelegramPage() {
  // Fetch data directly on the server before rendering
  const initialSettings = await getTelegramSettings();

  return (
    <TelegramManagement initialSettings={initialSettings} />
  );
}