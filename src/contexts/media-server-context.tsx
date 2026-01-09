'use client';
import { createContext, useContext } from 'react';

const MediaServerContext = createContext<MediaServerConfig | null>(null);

export function MediaServerProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: MediaServerConfig | null;
}) {
  return (
    <MediaServerContext.Provider value={value}>
      {children}
    </MediaServerContext.Provider>
  );
}

export function useMediaServer() {
  return useContext(MediaServerContext);
}
