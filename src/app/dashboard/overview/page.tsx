'use client';

import { useState, useEffect, useMemo } from 'react';
import { GlareCard } from '@/components/ui/glare-card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';
import { MovieDetailsTrigger } from '@/components/JAV/subscribe-detail-dialog-trigger';
import { VideoPlayer } from '@/components/JAV/video-player';
import { Rating, RatingButton } from '@/components/ui/shadcn-io/rating';
import { Button } from '@/components/ui/button';
import { Film, Calendar, TrendingUp, Clock, Star, PlayCircle } from 'lucide-react';
import { SearchComponent } from '@/components/search-command-dialog';
import { VideoInfo } from '@/types/javdb';


interface JAVDBResponse {
  success: boolean;
  data?: VideoInfo[];
  error?: string;
}

const RANKING_TYPES = [
  { value: 'javdb', label: 'JavDB' },
  { value: 'uncensored', label: '无码' }
];

const RANKING_PERIODS = [
  { value: 'daily', label: '日榜' },
  { value: 'weekly', label: '周榜' },
  { value: 'monthly', label: '月榜' }
];

// 解析rating数据的辅助函数
const parseRating = (ratingString: string | null) => {
  if (!ratingString) return { score: 0, count: 0 };

  // 匹配格式: "4.5分, 由3人評價" 或 "4.5分" 等
  const scoreMatch = ratingString.match(/(\d+\.?\d*)分/);
  const countMatch = ratingString.match(/由(\d+)人評價/);

  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
  const count = countMatch ? parseInt(countMatch[1]) : 0;

  return { score, count };
};

export default function OverviewPage() {
  const [activeType, setActiveType] = useState('censored');
  const [activePeriod, setActivePeriod] = useState('daily');
  const [data, setData] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
  };

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
  };

  const handleTrailerClick = (trailer: string, event: React.MouseEvent) => {
    console.log('Trailer URL:', trailer);

    event.stopPropagation(); // 阻止事件冒泡到MovieDetailsTrigger

    // 检查URL格式，如果是相对路径，添加域名
    let processedUrl = trailer;
    if (trailer && !trailer.startsWith('http')) {
      processedUrl = `https://javdb.com${trailer}`;
    }

    console.log('Processed URL:', processedUrl);
    setTrailerUrl(processedUrl);
    setIsVideoPlayerOpen(true);
  };

  const handleVideoPlayerClose = () => {
    setIsVideoPlayerOpen(false);
    setTrailerUrl(null);
  };



  return (
    <PageContainer>

      <div className="flex flex-1 flex-col space-y-6 p-6">
        <div className="mt-8 flex justify-center">
          <SearchComponent />
        </div>


      </div>

    </PageContainer>
  );
}
