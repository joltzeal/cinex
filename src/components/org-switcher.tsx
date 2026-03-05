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
    <SidebarMenu >
      <SidebarMenuItem >
        <SidebarMenuButton  className='px-0 py-0 h-14'>
          <div className='w-full flex items-center justify-start gap-3 '>
            <div className='text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
            <Image
              src="/icon.png"
              alt="Cinex"
              width={28}
              height={28}
              className='size-full object-cover'
            />
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
              保持干燥
            </span>
          </div>
          </div>
</SidebarMenuButton>
       
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
