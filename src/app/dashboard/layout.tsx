import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { MediaServerProvider } from '@/contexts/media-server-context';
import { getSetting, SettingKey } from '@/services/settings';
import { LoadingProvider } from '@/contexts/loading-context';
export const metadata: Metadata = {
  title: {
    template: '%s | Cinex',
    default: 'Cinex',
  },
  description: 'Acme site',
}

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
    const mediaServer = await getSetting(SettingKey.MediaServerConfig);

  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <KBar>
      <LoadingProvider><SidebarProvider defaultOpen={defaultOpen}>
        <InfobarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>
            <Header />
            {/* page main content */}
            <MediaServerProvider value={mediaServer}>
            {children}
          </MediaServerProvider>
            {/* page main content ends */}
          </SidebarInset>
          <InfoSidebar side='right' />
        </InfobarProvider>
      </SidebarProvider></LoadingProvider>
      
    </KBar>
  );
}
