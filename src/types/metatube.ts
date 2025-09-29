export interface DetailApiResponse {
  data: MovieDetail;
}
export interface SearchApiResponse {
  data: SearchResultItem[];
}
export interface SearchResultItem {
  id: string;             // "prestige:ABF-260"
  number: string;         // "ABF-260"
  title: string;
  provider: string;       // "AVBASE", "JAV321", etc.
  homepage: string;
  thumb_url: string;
  cover_url: string;
  score: number;
  actors: string[];
  release_date: string;   // "2025-08-21T00:00:00+09:00"
}

/**
* 代表从详情接口获取的完整影片元数据
*/
export interface MovieDetail {
  id: string;
  number: string;
  title: string;
  summary: string;
  provider: string;
  homepage: string;
  director: string | null;
  actors: string[];
  thumb_url: string;
  big_thumb_url: string;
  cover_url: string;
  big_cover_url: string;
  preview_video_url: string;
  preview_video_hls_url: string;
  preview_images: string[];
  maker: string;
  label: string;
  series: string;
  genres: string[];
  score: number;
  runtime: number;
  release_date: string;
}