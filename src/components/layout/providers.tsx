'use client';
import { useTheme } from 'next-themes';
import React from 'react';
import { ActiveThemeProvider } from '../active-theme';
import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  // we need the resolvedTheme value to set the baseTheme for clerk based on the dark or light theme
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  return (
    <>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <AuthUIProvider
          redirectTo='/dashboard'
          authClient={authClient}
          navigate={router.push}
          replace={router.replace}
          onSessionChange={() => {
            // Clear router cache (protected routes)
            router.refresh();
          }}
          Link={Link}
        >
          {children}
        </AuthUIProvider>
      </ActiveThemeProvider>
    </>
  );
}
