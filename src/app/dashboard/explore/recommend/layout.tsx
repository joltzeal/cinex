import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '推荐榜单',
  description: '浏览 JavDB、AVFAN、OneJav 等平台的热门影片排行榜'
};

export default function RecommendLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
