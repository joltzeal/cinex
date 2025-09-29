'use client';

// 1. Import SessionProvider instead of ClerkProvider
import { SessionProvider } from 'next-auth/react';
import React from 'react';

// We keep ActiveThemeProvider as it seems unrelated to Clerk's functionality
import { ActiveThemeProvider } from '../active-theme';

// The 'useTheme', 'dark', and 'ClerkProvider' imports are no longer needed
// import { ClerkProvider } from '@clerk/nextjs';
// import { dark } from '@clerk/themes';
// import { useTheme } from 'next-themes';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  // 2. The logic to get the theme for Clerk's appearance is no longer necessary
  // const { resolvedTheme } = useTheme();

  return (
    // 3. Wrap the children in SessionProvider. It does not need any initial props.
    <SessionProvider>
      {/* ActiveThemeProvider remains as it was, as it controls your custom themes */}
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        {children}
      </ActiveThemeProvider>
    </SessionProvider>
  );
}