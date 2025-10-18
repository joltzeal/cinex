import { z } from 'zod';
import SettingsPageClient from './settings-client-view';
import { allSettings } from '@/services/settings';



// This is the main Server Component
export default async function SettingsPage() {

  const settings = await allSettings()

  return (
    <SettingsPageClient
      settings={settings}
    />
  );
}