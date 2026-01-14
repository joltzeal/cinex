import SettingsPageClient from './settings-client-view';
import { allSettings } from '@/services/settings';
export const metadata = {
  title: '设置'
};
export default async function SettingsPage() {

  const settings = await allSettings()

  return (
    <SettingsPageClient
      settings={settings}
    />
  );
}