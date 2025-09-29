'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: '控制台', link: '/dashboard' }],
  '/dashboard/overview': [
    { title: '控制台', link: '/dashboard' },
    { title: '仪表盘', link: '/dashboard/overview' }
  ],
  '/dashboard/explore/recommend': [
    { title: '控制台', link: '/dashboard' },
    { title: '推荐', link: '/dashboard/explore/recommend' }
  ],
  '/dashboard/explore/search': [
    { title: '控制台', link: '/dashboard' },
    { title: '搜索', link: '/dashboard/explore/search' }
  ],
  '/dashboard/employee': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: 'Employee', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: 'Dashboard', link: '/dashboard' },
    { title: '商品', link: '/dashboard/product' }
  ],
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
