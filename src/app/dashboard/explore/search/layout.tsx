import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '磁力搜索',
  description: '聚合搜索全网磁力'
};

export default function SearchLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
