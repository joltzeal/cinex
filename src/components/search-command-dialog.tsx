"use client"

import {
  Film,
  LucideIcon, Search,
  Users,
  Video
} from "lucide-react"
import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog" // 移除 AlertDialogTrigger
import { useLoading } from "@/contexts/loading-context"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// 使用您提供的搜索类别
const searchCategories: { name: string; icon: LucideIcon }[] = [
  {
    name: "番号",
    icon: Film,
  },
  {
    name: "磁力",
    icon: Users,
  },
  {
    name: "在线播放",
    icon: Video
  }
];

// 注意：我假设这些 URL 是你希望在新标签页中打开的
const onlineVideoSources = [
  {
    name: "黄色仓库",
    url: (keyword: string) => {
      // 这里的URL请确保是合法的，并且可以在浏览器中正常访问
      return `http://hsck9.cctv23.cc/?search2=ndafeoafa&search=${encodeURIComponent(keyword)}`;
    },
  },
  {
    name: "9色",
    url: (keyword: string) => {
      // 这里的URL请确保是合法的，并且可以在浏览器中正常访问
      return `https://91porny.com/search?keywords=${encodeURIComponent(keyword)}`;
    },
  }
]

export function SearchComponent() {
  const [open, setOpen] = React.useState(false) // 控制 CommandDialog
  const [onlineVideoOpen, setOnlineVideoOpen] = React.useState(false) // 控制 AlertDialog
  const [inputValue, setInputValue] = React.useState("")
  const router = useRouter();
  const { showLoader, hideLoader, updateLoadingMessage } = useLoading();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSearchOnlineVideo = (keyword: string) => {
    // 关闭 Alert Dialog
    setOnlineVideoOpen(false);
    // 关闭 Command Dialog
    setOpen(false);
    // 清空输入框
    setInputValue("");

    // 循环打开多个标签页
    for (const source of onlineVideoSources) {
      window.open(source.url(keyword), '_blank', 'noopener,noreferrer');
    }
  }

  const handleSearch = async (category: string) => {
    const _inputValue = inputValue.trim();
    if (!_inputValue) {
      console.log("输入值为空，搜索操作被取消。");
      return;
    }

    try {
      if (category === "番号") {
        showLoader(`正在搜索${category} "${_inputValue}"的相关信息...`);
        const response = await fetch(`/api/movie/${_inputValue}`);

        if (!response.ok) {
          hideLoader();
          if (response.status === 404) {
            throw new Error(`未找到番号 "${_inputValue}" 的相关信息`);
          } else {
            throw new Error(`请求失败，状态码: ${response.status}`);
          }
        }
        setOpen(false); // 关闭搜索框
        setInputValue(""); // 清空输入框
        hideLoader();
        router.push(`/dashboard/explore/search/${_inputValue}`);
      } else if (category === "磁力") {
        toast.error("磁力搜索功能暂未实现");
        setOpen(false); // 关闭搜索框
        setInputValue(""); // 清空输入框
        return;
      } else if (category === "在线播放") {
        // 当用户点击 "在线播放" 时，打开 AlertDialog
        setOnlineVideoOpen(true);
        // 注意：这里 CommandDialog 不会立即关闭，而是等待用户在 AlertDialog 中做选择
        return;
      }

    } catch (err: any) {
      const errorMessage = err.message || '搜索失败';
      toast.error(errorMessage);
    } finally {
      // 可以在这里统一处理一些清理工作，例如如果需要，可以关闭 loading 状态
      // 但对于番号搜索，我们希望在路由跳转前就隐藏 loader
    }
    // 对于非 "在线播放" 的情况，如果还没有关闭，在这里关闭 CommandDialog
    if (category !== "在线播放") {
      setOpen(false);
      setInputValue(""); // 清空输入框
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-[250px] justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="inline-flex">搜索...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="搜索内容"
          value={inputValue}
          onValueChange={setInputValue}
        />
        <CommandList>
          <CommandEmpty>没有找到结果。</CommandEmpty>

          <CommandGroup heading="搜索选项">
            {searchCategories.map((category) => (
              <CommandItem
                key={category.name}
                // 当没有输入值时，禁用该项目
                disabled={!inputValue}
                onSelect={() => handleSearch(category.name)}
              >
                <category.icon className="mr-2 h-4 w-4" />
                <span>
                  {inputValue
                    ? <>搜索 “<span className="font-semibold">{inputValue}</span>” 相关的{category.name}</>
                    : `搜索${category.name}`
                  }
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* AlertDialog 不再需要 Trigger，直接由 onlineVideoOpen 状态控制 */}
      <AlertDialog open={onlineVideoOpen} onOpenChange={setOnlineVideoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要进行在线播放搜索吗？</AlertDialogTitle>
            <AlertDialogDescription>
              点击“搜索”将会在新标签页中打开多个视频网站，请注意浏览器可能会阻止弹窗。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* 取消时，仅关闭 AlertDialog，不影响 CommandDialog */}
            <AlertDialogCancel onClick={() => setOnlineVideoOpen(false)}>取消</AlertDialogCancel>
            {/* 确认时，调用 handleSearchOnlineVideo 并传入 inputValue */}
            <AlertDialogAction onClick={() => handleSearchOnlineVideo(inputValue)}>搜索</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}