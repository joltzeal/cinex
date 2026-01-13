// src/lib/scrapers/interface.ts

// 统一定义返回的数据对象类型，所有爬虫都应返回这个类型
export interface TorrentSearchResult {
  magnet: string;
  createdAt: string;
  size: string;
  recentDownloads: string;
  heat: string;
  fileList: string[];
  fileName: string;
}

// 定义所有爬虫类必须实现的接口
export interface IScraper {
  search(keyword: string, sort: number): Promise<TorrentSearchResult[]>;
}

// 定义一个类型，代表一个“可实例化的爬虫类”
// 它要求这个类有一个无参数的构造函数、实现了IScraper接口，并且有一个静态的 sourceName 属性
export type ScraperClass = {
  new(): IScraper;
  sourceName: string; 
};