import { Icons } from '@/components/icons';

export interface NavItem {
  title: string;
  url: string;
  disabled?: boolean;
  external?: boolean;
  shortcut?: [string, string];
  icon?: keyof typeof Icons;
  label?: string;
  description?: string;
  isActive?: boolean;
  items?: NavItem[];
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainNavItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;


export interface SseProgress {
  stage: 'AI_START' | 'AI_COMPLETE' | 'DOWNLOAD_SUBMIT' | 'PROGRESS' | 'DONE' | 'ERROR';
  message: string;
  data?: any;
}

export type OrganizeRecord = {
  id: string;
  title: string;
  subtitle: string;
  sourcePath: string;
  destinationPath: string;
  transferMethod: '硬链接' | '移动' | '复制' | '软链接';
  timestamp: string;
  status: '成功' | '失败' | '处理中';
};

export type FileTreeNode = {
  id: string;
  name: string;
  children?: FileTreeNode[];
};