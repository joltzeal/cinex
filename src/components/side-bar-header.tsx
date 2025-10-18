'use client';
import * as React from 'react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';


import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"; // 确保路径与您的项目结构匹配

/**
 * Sidebar 顶部的项目展示组件
 * - 使用 shadcn/ui 的 Avatar 组件
 * - 所有值均为硬编码
 * - 颜色继承自项目的主题 (Theme Provider)，不使用显式颜色类
 */
export function SideBarHeader() {
  const projectName = "Cinex";
  const slogan = "不建议单手使用电脑";

  return (
    <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <Avatar className="rounded-lg">
                <AvatarImage
                  src="/cinex.png"
                  alt="cinex"
                />
                <AvatarFallback>CI</AvatarFallback>
              </Avatar>
            <div className='flex flex-col gap-0.5 leading-none'>
              <span className='font-semibold'>{projectName}</span>
              <span className='text-xs text-muted-foreground'>{slogan}</span>
            </div>

          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
  );
}