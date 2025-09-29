"use client"

import {
  Film,
  LucideIcon,
  Search,
  Users,
} from "lucide-react"
import * as React from "react"

import { useLoading } from "@/app/context/loading-context"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useMovieStore } from "@/store/useMovieStore"
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
];

export function SearchComponent() {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const router = useRouter();
  // 2. 从 Store 中获取设置数据的 action
  const setCurrentMovie = useMovieStore((state) => state.setCurrentMovie);
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

  // 搜索逻辑的实现函数
  const handleSearch = async (category: string) => {
    // 增加一个安全检查，尽管 disabled 属性会阻止调用
    console.log("handleSearch", category, inputValue);
    
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

        const result = await response.json(); // 获取返回的 JSON 数据

        // 2. 关键改动：将获取到的数据存入 Zustand Store
        if (result && result.data) {
          setCurrentMovie(result.data);
        } else {
          hideLoader();
          // 如果 API 成功但没有返回有效数据，也抛出错误
          throw new Error("API 返回的数据格式不正确");
        }
        
        // 3. 关闭搜索框并跳转
        setOpen(false);
        hideLoader();
        router.push(`/dashboard/explore/search/${_inputValue}`);
      } else if (category === "磁力") {
        toast.error("磁力搜索功能暂未实现");
        return;
      }


    } catch (err: any) {
      const errorMessage = err.message || '搜索失败';
      toast.error(errorMessage);
    } finally {
      
    }

    console.log(`正在触发搜索: "${inputValue}", 类别: ${category}`);
    // 在这里实现您的 API 调用或其他搜索逻辑
    // 例如: searchAPI.fetch({ query: inputValue, category: category })

    // 搜索后关闭对话框
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-[400px] justify-start text-muted-foreground"
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
                // 关键改动：当没有输入值时，禁用该项目
                disabled={!inputValue}
                onSelect={() => handleSearch(category.name)}
              >
                <category.icon className="mr-2 h-4 w-4" />

                {/* 关键改动：根据是否有输入值来显示不同的文本 */}
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
    </>
  )
}