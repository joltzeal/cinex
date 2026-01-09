import { MovieStatus } from '@prisma/client';

export interface VideoInfo {
  code: string | null;
  title: string | null;
  cover: string | undefined; // attr('src') 找不到时返回 undefined
  date: string | null;
  score: number | null;
  reviews: number | null;
  link: string | null;
  status?: MovieStatus;
}

interface ParsedItemData {
  title: string;
  link: string;
  // ... 其他你可能从 item 的顶层标签提取的字段
  coverImage: string | null;
  details: {
    videoCode: string | null;
    releaseDate: string | null;
    duration: string | null;
    director: string | null;
    rating: string | null;
    maker: string | null;
    series: string | null;
    trailer: string | null;
    tags: string[];
    actors: string[];
  };
  sampleImages: string[];
}
