'use client';

import { GalleryVerticalEnd } from 'lucide-react';
import Image from 'next/image';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export function OrgSwitcher() {
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='cursor-default hover:bg-transparent'
        >
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
            {/* 您可以在这里替换为您的 logo 图片 */}
            {/* <Image
              src="/cinex.png"
              alt="Cinex"
              width={32}
              height={32}
              className='size-full object-cover'
            /> */}
            <GalleryVerticalEnd className='size-4' />
          </div>
          <div
            className={`grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out ${
              state === 'collapsed'
                ? 'invisible max-w-0 overflow-hidden opacity-0'
                : 'visible max-w-full opacity-100'
            }`}
          >
            <span className='truncate font-semibold'>Cinex</span>
            <span className='text-muted-foreground truncate text-xs'>
              管理系统
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
