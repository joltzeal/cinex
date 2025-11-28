
import { NavItem } from '@/types';
import { Rss, Film, Library, Download, MessageCircle } from "lucide-react";
export type Product = {
  photo_url: string;
  name: string;
  description: string;
  created_at: string;
  price: number;
  id: number;
  category: string;
  updated_at: string;
};

//Info: The following data is used for the sidebar navigation and Cmd K bar.
export const navItems: NavItem[] = [
  {
    title: '仪表盘',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [] // Empty array as there are no child items for Dashboard
  },
  {
    title:'发现',
    url: '/dashboard/explore/recommend',
    icon: 'adjustSearch',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [
      {
        title: '推荐',
        url: '/dashboard/explore/recommend',
        icon: 'recommended',
        shortcut: ['p', 'h'],
        isActive: true,
      },
      {
        title: '搜索',
        url: '/dashboard/explore/search',
        icon: 'search',
        shortcut: ['s', 's'],
        isActive: true,
      }
    ] // Empty array as there are no child items for Dashboard
  },
  {
    title: '订阅',
    url: '/dashboard/subscribe/movie', // Placeholder as there is no direct link for the parent
    icon: 'fileRss',
    isActive: false,
    items: [
      {
        title: '影片',
        url: '/dashboard/subscribe/movie',
        icon: 'movie',
      },
      {
        title: '帖子',
        url: '/dashboard/subscribe/forum',
        icon: 'forum',
      },
      {
        title: '订阅源',
        url: '/dashboard/subscribe/JAV',
        icon: 'rss',
      },
      {
        title: 'Telegram',
        url: '/dashboard/subscribe/telegram',
        icon: 'telegram',
      }
    ]
  },
  {
    title: '文件',
    url: '/dashboard/file/task',
    icon: 'media',
    isActive: false,
    items: [
      {
        title: '下载任务',
        url: '/dashboard/file/task',
        icon: 'listCheck',
        shortcut: ['x', 'z'],
        isActive: false,
      },
      {
        title: '文件管理',
        url: '/dashboard/file/manager',
        icon: 'media',
        isActive: true,
      },
      {
        title: '视频整理',
        url: '/dashboard/file/scraper',
        icon: 'layersSelected',
        isActive: true,
      }
    ] // No child items
  },
  // {
  //   title: 'Account',
  //   url: '#', // Placeholder as there is no direct link for the parent
  //   icon: 'billing',
  //   isActive: true,

  //   items: [
  //     {
  //       title: 'Profile',
  //       url: '/dashboard/profile',
  //       icon: 'userPen',
  //       shortcut: ['m', 'm']
  //     },
  //     {
  //       title: 'Login',
  //       shortcut: ['l', 'l'],
  //       url: '/',
  //       icon: 'login'
  //     }
  //   ]
  // },
  {
    title: '设置',
    url: '/dashboard/settings',
    icon: 'settings',
    shortcut: ['k', 'k'],
    isActive: false,
    items: [] // No child items
  },
  {
    title: 'Kanban',
    url: '/dashboard/kanban',
    icon: 'kanban',
    shortcut: ['k', 'k'],
    isActive: false,
    items: [] // No child items
  }
];




export const JAVBUS = 'https://www.javbus.com';

/* 爬取页面超时时间 */
export const JAVBUS_TIMEOUT = 5000;

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

export const RANKINGS_CACHE_DURATION_MS = 60 * 60 * 1000 * 6; // 6 小时
export const RANKINGS_JAVDB_BASE_URL = 'https://javdb.com/rankings/movies';

export const ARANKINGS_CCESS_DENIED_MESSAGE = '由於版權限制，本站禁止了你的網路所在國家的訪問。';
export const DOCKER_MOUNT_PATH = './media'; // 容器内挂载的媒体目录
export const SubscribeMovieStatusMap = {
  subscribed: {
    label: '已订阅',
    variant: 'destructive',
  },
  downloading: {
    label: '下载中',
    variant: 'destructive',
  },
  downloaded: {
    label: '已下载',
    variant: 'destructive',
  },
  added: {
    label: '已入库',
    variant: 'destructive',
  },
}

export const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg'];

export const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];

export const ALLOWED_DOMAINS = [
  'www.javbus.com',
  'javbus.com',
  'pics.dmm.co.jp',
  'dmm.co.jp',
  'awsimgsrc.dmm.co.jp',
  'image.mgstage.com'
  // 在这里添加其他你需要的图片来源域名
];

export const FORUMS = ['2048', 'sehuatang','javbus','t66y','southPlus'];

export const FORUM_MAP = {
  f2048: 'https://hjd2048.com',
  sehuatang: 'https://www.sehuatang.net',
  javbus: 'https://www.javbus.com',
  t66y: 'https://t66y.com/thread0806.php',
  southPlus: 'https://www.south-plus.net',
}
export const BASE_HEADER = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
}


export const SCHEDULED_TASKS = [
  {
    id: 'javbus-movie-update',
    name: 'JAV 影片更新',
    initial: '更',
    schedule: '30 */6 * * *',
    status: '运行中',
    description: '为已订阅的影片获取磁力链接并发送下载请求。',
    icon: Film,
  },
  {
    id: 'javbus-subscribe-update',
    name: 'JAV 订阅更新',
    initial: '订',
    schedule: '0 */12 * * *',
    status: '运行中',
    description: '扫描所有 JAVBus 订阅源，查找并保存新的影片。',
    icon: Rss,
  },
  
  // {
  //   id: 'download-status-sync',
  //   name: '下载状态同步',
  //   initial: '下',
  //   schedule: '*/5 * * * *',
  //   status: '运行中',
  //   description: '与下载器客户端同步，更新数据库中所有任务的下载状态。',
  //   icon: Download,
  // },
  {
    id: 'media-scraping',
    name: '媒体刮削',
    initial: '刮',
    schedule: '*/10 * * * *',
    description: '刮削媒体库中的影片。',
    status: '运行中',
    icon: Rss,
  },
  
  {
    id: 'media-library-sync',
    name: '媒体库同步',
    initial: '同',
    schedule: '*/10 * * * *',
    description: '同步媒体库中的影片到数据库。',
    status: '运行中',
    icon: Library,
  },
  {
    id: 'forum-update',
    name: '论坛更新',
    initial: '论',
    schedule: '*/10 * * * *',
    description: '扫描所有论坛订阅源，查找并保存新的帖子。',
    status: '运行中',
    icon: MessageCircle,
  }
];