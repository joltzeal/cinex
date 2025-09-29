
import { NavItem } from '@/types';

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

export interface SaleUser {
  id: number;
  name: string;
  email: string;
  amount: string;
  image: string;
  initials: string;
}



export const JAVBUS = 'https://www.javbus.com';

/* 爬取页面超时时间 */
export const JAVBUS_TIMEOUT = 5000;

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

export const RANKINGS_CACHE_DURATION_MS = 60 * 60 * 1000 * 6; // 6 小时
export const RANKINGS_JAVDB_BASE_URL = 'https://javdb.com/rankings/movies';

export const ARANKINGS_CCESS_DENIED_MESSAGE = '由於版權限制，本站禁止了你的網路所在國家的訪問。';


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
