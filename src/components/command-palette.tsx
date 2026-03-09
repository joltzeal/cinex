"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import {
  Film,
  Search,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLoading } from "@/contexts/loading-context";
import { Button } from "./ui/button";

// 搜索类别配置
const searchCategories: { name: string; icon: LucideIcon }[] = [
  { name: "番号", icon: Film },
  { name: "磁力", icon: Users },
  { name: "在线播放", icon: Video },
];

// 在线播放源
const onlineVideoSources = [
  {
    name: "黄色仓库",
    url: (keyword: string) => `http://hsck9.cctv23.cc/?search2=ndafeoafa&search=${encodeURIComponent(keyword)}`,
  },
  {
    name: "9色",
    url: (keyword: string) => `https://91porny.com/search?keywords=${encodeURIComponent(keyword)}`,
  },
];

const overlayTransition: Transition = { duration: 0.24, ease: "easeOut" };

export function SearchPalette() {
  // UI 状态
  const [isOpen, setIsOpen] = React.useState(false);
  const [onlineVideoOpen, setOnlineVideoOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // 业务 Hooks
  const router = useRouter();
  const { showLoader, hideLoader } = useLoading();
  const shouldReduceMotion = useReducedMotion();

  // 监听 ⌘K 快捷键
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // 处理在线视频搜索（打开多个标签页）
  const handleSearchOnlineVideo = (keyword: string) => {
    setOnlineVideoOpen(false);
    setIsOpen(false);
    setInputValue("");

    for (const source of onlineVideoSources) {
      window.open(source.url(keyword), "_blank", "noopener,noreferrer");
    }
  };

  // 处理分类搜索核心逻辑
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
        setIsOpen(false); // 关闭搜索框
        setInputValue(""); // 清空输入框
        hideLoader();
        router.push(`/dashboard/explore/search/${_inputValue}`);
      } else if (category === "磁力") {
        toast.error("磁力搜索功能暂未实现");
        setIsOpen(false); // 关闭搜索框
        setInputValue(""); // 清空输入框
        return;
      } else if (category === "在线播放") {
        // 当用户点击 "在线播放" 时，打开 AlertDialog
        setOnlineVideoOpen(true);
        setIsOpen(false); // 关闭搜索框
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
      setIsOpen(false);
      setInputValue(""); // 清空输入框
    }
  };

  // 动画变体
  const panelVariants: Variants = shouldReduceMotion
    ? {
      initial: { opacity: 0, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 0, scale: 1 },
    }
    : {
      initial: { opacity: 0, scale: 0.96, y: 20, filter: "blur(6px)" },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.28, ease: [0.18, 0.89, 0.32, 1.12] },
      },
      exit: {
        opacity: 0,
        scale: 0.97,
        y: 12,
        filter: "blur(8px)",
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
      },
    };

  return (
    <>
      {/* 触发按钮（保留了玻璃拟物化风格） */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-[250px] justify-start text-muted-foreground"
          onClick={() => setIsOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="inline-flex">搜索...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* 背景遮罩 */}
              <motion.div
                aria-hidden
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={overlayTransition}
                onClick={() => setIsOpen(false)}
              />

              {/* 弹窗主体 */}
              <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-24 sm:px-6">
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Command palette"
                  {...panelVariants}
                  className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-card/90 backdrop-blur-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* 氛围发光背景 */}
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    <motion.div
                      className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-[150px]"
                      animate={
                        shouldReduceMotion ? undefined : { opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.98] }
                      }
                      transition={
                        shouldReduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: "easeInOut" }
                      }
                    />
                    <motion.div
                      className="absolute bottom-[-30%] right-[-5%] h-72 w-72 rounded-full bg-emerald-400/20 blur-[160px]"
                      animate={
                        shouldReduceMotion ? undefined : { opacity: [0.2, 0.5, 0.2], rotate: [0, 12, 0] }
                      }
                      transition={
                        shouldReduceMotion ? undefined : { duration: 10, repeat: Infinity, ease: "linear" }
                      }
                    />
                  </div>

                  {/* 搜索输入区域 */}
                  <div className="relative flex items-center gap-3 border-b border-border/60 px-5 py-4">
                    <Search className="h-5 w-5 text-primary" aria-hidden />
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      placeholder="输入关键字进行检索..."
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      autoFocus
                    />
                    <motion.button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      whileHover={shouldReduceMotion ? undefined : { rotate: 90, scale: 1.05 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      <span className="sr-only">关闭</span>
                    </motion.button>
                  </div>

                  {/* 搜索选项列表 */}
                  <motion.div
                    className="relative max-h-96 overflow-y-auto px-3 py-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                      搜索选项
                    </div>
                    <ul className="space-y-2" role="list">
                      {searchCategories.map((category, index) => {
                        const Icon = category.icon;
                        const isDisabled = !inputValue.trim();

                        return (
                          <motion.li
                            key={category.name}
                            initial={{
                              opacity: shouldReduceMotion ? 1 : 0,
                              y: shouldReduceMotion ? 0 : 12,
                            }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={
                              shouldReduceMotion ? { duration: 0 } : { delay: 0.04 * index, duration: 0.24, ease: "easeOut" }
                            }
                          >
                            <button
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleSearch(category.name)}
                              className={`group flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${isDisabled
                                ? "cursor-not-allowed opacity-50"
                                : "bg-white/5 hover:border-border hover:bg-white/10"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-white/5 text-primary shadow-sm backdrop-blur">
                                  <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    {inputValue ? (
                                      <>搜索 “<span className="font-semibold text-primary">{inputValue}</span>” 相关的{category.name}</>
                                    ) : (
                                      `搜索${category.name}`
                                    )}
                                  </span>
                                </div>
                              </div>
                            </button>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </motion.div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 拦截在线播放的 AlertDialog */}
      <AlertDialog open={onlineVideoOpen} onOpenChange={setOnlineVideoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要进行在线播放搜索吗？</AlertDialogTitle>
            <AlertDialogDescription>
              点击“搜索”将会在新标签页中打开多个视频网站，请注意浏览器可能会阻止弹窗。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOnlineVideoOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSearchOnlineVideo(inputValue)}>搜索</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}