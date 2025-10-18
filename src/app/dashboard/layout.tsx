import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MediaServerProvider } from '@/contexts/media-server-context';
import { getSetting, SettingKey } from '@/services/settings';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Cinex',
  description: 'Effortless Video Archiving'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const mediaServer = await getSetting(SettingKey.MediaServerConfig);
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>

        <AppSidebar />
        <SidebarInset>
          <Header />
          <MediaServerProvider value={mediaServer}>
            {children}
          </MediaServerProvider>

        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
