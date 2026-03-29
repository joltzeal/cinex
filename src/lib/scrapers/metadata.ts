export const SCRAPER_OPTIONS = [
  { id: 'clgclg', label: '磁力狗' },
  { id: 'laowang', label: '老王磁力' },
  { id: 'anybt', label: 'anybt' },
  { id: 'btdigg', label: 'btdigg' },
  { id: 'clxq', label: '磁力星球' },
] as const;

export type ScraperId = (typeof SCRAPER_OPTIONS)[number]['id'];
