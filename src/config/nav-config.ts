import { Setting } from '@prisma/client';
import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [

  {
    title: 'Overview',
    url: '#',
    isActive: false,
    shortcut: ['d', 'd'],
    items: [
      {
        title: '仪表盘',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: [] // Empty array as there are no child items for Dashboard
      },
      {
        title: '推荐',
        url: '/dashboard/explore/recommend',
        icon: 'recommended',
        shortcut: ['p', 'h'],
        isActive: true
      },
      {
        title: '搜索',
        url: '/dashboard/explore/search',
        icon: 'search',
        shortcut: ['s', 's'],
        isActive: true
      }
    ] // Empty array as there are no child items for Dashboard
  },
  
  {
    title: 'Subscribe',
    url: '#', // Placeholder as there is no direct link for the parent
    icon: 'fileRss',
    isActive: false,
    items: [
      {
        title: '影片',
        url: '/dashboard/subscribe/movie',
        icon: 'movie'
      },
      {
        title: '帖子',
        url: '/dashboard/subscribe/forum',
        icon: 'forum'
      },
      {
        title: '订阅源',
        url: '/dashboard/subscribe/JAV',
        icon: 'rss'
      },
      {
        title: 'Telegram',
        url: '/dashboard/subscribe/telegram',
        icon: 'telegram'
      }
    ]
  },
  {
    title: 'File',
    url: '#',
    icon: 'media',
    isActive: false,
    items: [
      {
        title: '下载任务',
        url: '/dashboard/file/task',
        icon: 'listCheck',
        shortcut: ['x', 'z'],
        isActive: false
      },
      {
        title: '文件管理',
        url: '/dashboard/file/manager',
        icon: 'media',
        isActive: true
      },
      {
        title: '视频整理',
        url: '/dashboard/file/scraper',
        icon: 'layersSelected',
        isActive: true
      }
    ] // No child items
  },
  {
    title: 'Settings',
    url: '#',
    icon: 'settings',
    shortcut: ['k', 'k'],
    isActive: false,
    items: [{
      title: '设置',
      url: '/dashboard/settings',
      icon: 'settings',
      shortcut: ['k', 'k'],
      isActive: false,
      items: [] // No child items
    }] // No child items
  },
  
];
