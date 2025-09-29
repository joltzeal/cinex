import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/lib/font';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { GlobalLightboxProvider } from '@/components/global-lightbox-provider';
import { GlobalLoader } from '@/components/global-loader';
import './globals.css';
import './theme.css';

// 初始化应用（包括定时任务）
import '@/lib/init';
import { LoadingProvider } from './context/loading-context';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

export const metadata: Metadata = {
  title: 'Cinex',
  description: 'Effortless Video Archiving',
  icons: {
    icon: '/cinex.png'
  }
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isScaled = activeThemeValue?.endsWith('-scaled');

  return (
    <html lang='en' suppressHydrationWarning>
      <link rel="icon" href="/cinex.png" sizes="any" />

      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
          }}
        />
        {/* 加载迅雷SDK */}
        <script src="//open.thunderurl.com/thunder-link.js"></script>
      </head>
      <body
        className={cn(
          'bg-background overflow-hidden overscroll-none font-sans antialiased',
          activeThemeValue ? `theme-${activeThemeValue}` : '',
          isScaled ? 'theme-scaled' : '',
          fontVariables
        )}
      >
        <NextTopLoader showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={activeThemeValue as string}>
              <LoadingProvider>
                <Toaster />
                {children}
                <GlobalLightboxProvider />
                <GlobalLoader />
              </LoadingProvider>

            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
