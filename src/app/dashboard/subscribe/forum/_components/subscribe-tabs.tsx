'use server';
import { prisma } from "@/lib/prisma";
import { ForumSubscribe } from "@prisma/client";
import Link from "next/link";
import { AddSubscribeDialog } from "./add-subscribe-dialog";
import { DeleteThreadButton } from "./delete-thread-button";
import { SearchInput } from "./search-input";
import { ReadFilterToggle } from "./read-filter-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { CookieSettingsDialog } from "./cookie-setting";
import { getSetting, SettingKey } from "@/services/settings";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getForumPostReadFilterWhere, READ_FILTER_QUERY_KEY, type ReadFilter } from "./read-filter";

interface SubscribeTabsProps {
  currentForumId?: string;
  currentThreadId?: string;
  searchQuery?: string;
  readFilter?: ReadFilter;
}

// 论坛名称映射
const FORUM_NAMES: Record<string, string> = {
  '2048': '2048论坛',
  'sehuatang': '色花堂',
  'javbus': 'JavBus',
  't66y': '草榴社区',
  'southPlus': '南+',
};

export async function SubscribeTabs({ currentForumId, currentThreadId, searchQuery, readFilter = 'all' }: SubscribeTabsProps) {
  // 查询所有订阅
  const subscriptions = await prisma.forumSubscribe.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // 查询收藏的帖子数量
  const starredPostsCount = await prisma.forumPost.count({
    where: {
      isStar: true,
      ...getForumPostReadFilterWhere(readFilter),
    },
  });

  // 查询搜索结果数量（模糊匹配 title 或 content）
  const searchPostsCount = searchQuery
    ? await prisma.forumPost.count({
      where: {
        OR: [
          {
            title: {
              contains: searchQuery,
            },
          },
          {
            content: {
              contains: searchQuery,
            },
          },
        ],
        ...getForumPostReadFilterWhere(readFilter),
      },
    })
    : 0;

  if (subscriptions.length === 0) {
    return (
      <div className="border-b bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-muted-foreground">暂无订阅</p>
          <AddSubscribeDialog />
        </div>
      </div>
    );
  }

  // 按 forum 字段分组
  const groupedSubscriptions = subscriptions.reduce((acc: Record<string, ForumSubscribe[]>, sub: ForumSubscribe) => {
    const forumKey = sub.forum;
    if (!acc[forumKey]) {
      acc[forumKey] = [];
    }
    acc[forumKey].push(sub);
    return acc;
  }, {} as Record<string, ForumSubscribe[]>);

  const currentSubscription = subscriptions.find(
    (sub: ForumSubscribe) => sub.forum === currentForumId && sub.thread === currentThreadId
  );
  const currentSettings = await getSetting(SettingKey.ForumCookie);
  const components: { title: string; href: string; description: string }[] = [
    {
      title: "Alert Dialog",
      href: "/docs/primitives/alert-dialog",
      description:
        "A modal dialog that interrupts the user with important content and expects a response.",
    },
    {
      title: "Hover Card",
      href: "/docs/primitives/hover-card",
      description:
        "For sighted users to preview content available behind a link.",
    },
    {
      title: "Progress",
      href: "/docs/primitives/progress",
      description:
        "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
    },
    {
      title: "Scroll-area",
      href: "/docs/primitives/scroll-area",
      description: "Visually or semantically separates content.",
    },
    {
      title: "Tabs",
      href: "/docs/primitives/tabs",
      description:
        "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
    },
    {
      title: "Tooltip",
      href: "/docs/primitives/tooltip",
      description:
        "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
    },
  ]
  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-4">
          {/* 搜索输入框 */}
          <SearchInput />

          {/* 全部/未读 切换 */}
          <ReadFilterToggle />

          {/* 导航菜单 */}
          <NavigationMenu>
            <NavigationMenuList>
              {(Object.entries(groupedSubscriptions) as [string, ForumSubscribe[]][]).map(([forumId, forumSubs]) => (
                <NavigationMenuItem key={forumId}>
                  <NavigationMenuTrigger className="text-sm">
                    {FORUM_NAMES[forumId] || forumId}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-100 gap-2 md:w-125 md:grid-cols-2 lg:w-150">
                      {forumSubs.map((sub: ForumSubscribe) => {
                        const isActive = sub.forum === currentForumId && sub.thread === currentThreadId;
                        const lastCheckedText = sub.lastChecked
                          ? formatDistanceToNow(sub.lastChecked, {
                            addSuffix: true,
                            locale: zhCN
                          })
                          : '从未检查';
                        return <li>
                          <NavigationMenuLink render={
                            <Link href={`/dashboard/subscribe/forum?${new URLSearchParams({
                              forumId: sub.forum,
                              threadId: sub.thread,
                              ...(readFilter === 'unread' ? { [READ_FILTER_QUERY_KEY]: 'unread' } : {}),
                            }).toString()}`} className={
                              cn(isActive ? "bg-muted" : "hover:bg-muted/10",)
                            }><div className={
                              cn(
                                "w-full",
                              )
                            }>
                                <div className="flex items-center justify-between w-full ">
                                  <div >
                                    <div className="text-sm font-medium leading-none mb-1">
                                      {sub.title || sub.thread}
                                    </div>
                                    <div className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                      最后更新: {lastCheckedText}
                                    </div>
                                  </div>
                                  <div >
                                    <DeleteThreadButton forumId={sub.forum} threadId={sub.thread} />
                                  </div>
                                </div>
                              </div></Link>
                          } />
                        </li>
                      })}
                    </ul>
                  </NavigationMenuContent>
                  {/* <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {forumSubs.map((sub: ForumSubscribe) => {
                        const isActive = sub.forum === currentForumId && sub.thread === currentThreadId;
                        const lastCheckedText = sub.lastChecked
                          ? formatDistanceToNow(sub.lastChecked, {
                              addSuffix: true,
                              locale: zhCN
                            })
                          : '从未检查';
                        return (
                          <li key={sub.id}>
                            
                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                              
                              <Link
                                href={`/dashboard/subscribe/forum?${new URLSearchParams({
                                  forumId: sub.forum,
                                  threadId: sub.thread,
                                  ...(readFilter === 'unread' ? { [READ_FILTER_QUERY_KEY]: 'unread' } : {}),
                                }).toString()}`}
                                className={
                                  cn(
                                    "w-full",
                                  )
                                }
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div >
                                    <div className="text-sm font-medium leading-none">
                                      {sub.title || sub.thread}
                                    </div>
                                    <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                                      最后更新: {lastCheckedText}
                                    </p>
                                  </div>
                                  <div >
                                    <DeleteThreadButton forumId={sub.forum} threadId={sub.thread} />
                                  </div>
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent> */}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* 显示搜索结果数量 */}
          {currentForumId === 'search' && searchQuery && (
            <div className="text-sm text-muted-foreground px-4">
              找到 {searchPostsCount} 条结果
            </div>
          )}

          <Link
            href={`/dashboard/subscribe/forum?${new URLSearchParams({
              forumId: 'star',
              ...(readFilter === 'unread' ? { [READ_FILTER_QUERY_KEY]: 'unread' } : {}),
            }).toString()}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 px-4",
              currentForumId === 'star' && "bg-accent text-accent-foreground"
            )}
          >
            <Star className={cn("h-4 w-4", currentForumId === 'star' && "fill-current")} />
            收藏 ({starredPostsCount})
          </Link>
          <AddSubscribeDialog />
          {/* {currentForumId && currentThreadId && currentForumId !== 'star' && currentForumId !== 'search' && (
            <SyncButton forumId={currentForumId} threadId={currentThreadId} />
          )} */}
          <CookieSettingsDialog currentSettings={currentSettings || { javbus: '', southplus: '' }} />
        </div>
      </div>
    </div>
  );
}
function ListItem({
  title,
  children,
  href,

  sub,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string, title: string, children: React.ReactNode, sub: string, forum: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink render={
        <Link href={href}><div className="flex flex-col gap-1 text-sm">
          <div className="leading-none font-medium">{title}</div>
          <div className="line-clamp-2 text-muted-foreground">{children}</div>
        </div></Link>
      } />
    </li>
  )
}