export const READ_FILTER_QUERY_KEY = 'read' as const;

export type ReadFilter = 'all' | 'unread';

export function normalizeReadFilter(value: string | null | undefined): ReadFilter {
  return value === 'unread' ? 'unread' : 'all';
}

export function getForumPostReadFilterWhere(readFilter: ReadFilter) {
  if (readFilter === 'unread') {
    return { readed: false };
  }
  return {};
}

