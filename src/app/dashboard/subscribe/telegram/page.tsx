import PageContainer from '@/components/layout/page-container';
import { TelegramManagement, TelegramSettings } from './management';
import { getSetting, SettingKey } from '@/services/settings';

async function getTelegramSettings(): Promise<TelegramSettings> {

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


export default async function HomePage() {
  // Fetch data directly on the server before rendering
  const initialSettings = await getTelegramSettings();

  return (
    <PageContainer scrollable={false}>
      <TelegramManagement initialSettings={initialSettings} />
    </PageContainer>
  );
}