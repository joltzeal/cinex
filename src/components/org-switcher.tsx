'use client';

import { Check, ChevronsUpDown, GalleryVerticalEnd, Home, Plus } from 'lucide-react';
import Image from 'next/image';

import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function OrgSwitcher() {
  const { state } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger className='w-full'>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                {/* <GalleryVerticalEnd className="size-4" /> */}
                <Avatar>
                  <AvatarImage
                    src="/icon.png"
                    alt="cinex"
                    className=""
                  />
                  <AvatarFallback>CI</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Cinex</span>
                <span className="text-muted-foreground">保持干燥</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--base-dropdown-menu-trigger-width)"
            align="start"
          >
            <DropdownMenuItem

            >
              <div>
                给个 Star
              </div>
              <Check className="ml-auto" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
