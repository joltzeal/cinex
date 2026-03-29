"use client"

import React, { useState, useMemo } from "react"
import {
  Search, Zap, FileArchive,
  File, ArrowRight, Download, Link as LinkIcon,
  Copy, ChevronDown, Loader2,
  Eye,
  Plus,
  SlidersHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { MagnetPreviewDialog } from '@/components/magnet/magnet-preview-dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { TorrentSearchResult } from '@/lib/scrapers/interface'
import { useLoading } from '@/contexts/loading-context'
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { subscribeToTaskToast } from "@/lib/task-sse-subscribe"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { SCRAPER_OPTIONS, type ScraperId } from "@/lib/scrapers/metadata"

interface SourceData {
  count: number
  list: TorrentSearchResult[]
}

interface ApiResponse {
  query: {
    searchKeyword: string
    sort: string
    type: number
    sources: ScraperId[]
  }
  data: {
    [source: string]: SourceData
  }
}

const parseSizeToMB = (sizeStr: string): number => {
  if (!sizeStr) return 0
  const size = parseFloat(sizeStr)
  if (isNaN(size)) return 0
  if (sizeStr.toUpperCase().includes('GB')) return size * 1024
  if (sizeStr.toUpperCase().includes('TB')) return size * 1024 * 1024
  if (sizeStr.toUpperCase().includes('KB')) return size / 1024
  return size
}

const truncateFileName = (fileName: string, maxLength = 30): string => {
  if (fileName.length <= maxLength) return fileName
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return fileName.slice(0, maxLength) + '...'
  const ext = fileName.slice(lastDot)
  const name = fileName.slice(0, lastDot)
  const keepChars = 3
  if (name.length <= keepChars) return fileName
  return name.slice(0, maxLength - ext.length - keepChars - 3) + '...' + name.slice(-keepChars) + ext
}

export default function MagnetPage() {
  const [hasSearched, setHasSearched] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ApiResponse | null>(null)
  const [selectedResult, setSelectedResult] = useState<TorrentSearchResult | null>(null)
  const [activeSource, setActiveSource] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [minSize, setMinSize] = useState(0)
  const [maxSize, setMaxSize] = useState(100)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { showLoader, hideLoader } = useLoading()
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedScrapers, setSelectedScrapers] = useState<ScraperId[]>(
    SCRAPER_OPTIONS.map((item) => item.id)
  );

  const selectedScraperLabel = useMemo(() => {
    if (selectedScrapers.length === SCRAPER_OPTIONS.length) return "全部爬虫"
    if (selectedScrapers.length === 0) return "未选择爬虫"
    if (selectedScrapers.length === 1) {
      return SCRAPER_OPTIONS.find((item) => item.id === selectedScrapers[0])?.label || "1 个爬虫"
    }
    return `已选 ${selectedScrapers.length} 个爬虫`
  }, [selectedScrapers])

  const handleDownload = async ({link,downloadImmediately}:{ link:string,downloadImmediately:boolean}) => {
    console.log(link,downloadImmediately)

    if (!link) {
      toast.error("没有磁力链接");
      return;
    }



    const formData = new FormData();
    let images;

    formData.append("downloadURLs", JSON.stringify([link]));
    formData.append("downloadImmediately", downloadImmediately.toString());

    // // 🔥 关键：显示全屏 loading
    // showLoader("正在提交下载任务...");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "创建失败");
      }

      if (response.status === 202 && result.taskId) {
        subscribeToTaskToast(result.taskId, (data) => {
          // 如果需要，这里可以根据 data 更新页面的其他部分
          if (data.stage === 'DONE' || data.stage === 'ERROR') {
            setIsProcessing(false);
          }
        });
        // 异步任务启动，更新 loader 文本并开始监听
        // setTaskId(result.taskId); // 设置 taskId
        // updateLoadingMessage("任务已启动，正在连接服务器...");
        // listenToSse(result.taskId);
        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        // hideLoader(); // 隐藏 loader
        toast.success(result.message || "文档创建成功！");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      // hideLoader(); // 隐藏 loader
      toast.error(`发生错误: ${error.message}`);
      setIsSubmitting(false); // 出错时解锁按钮
    }
  }

  const handleAddDownload = async () => {

  }

  const filteredResults = useMemo(() => {
    if (!searchResults?.data[activeSource]) return []
    return searchResults.data[activeSource].list.filter((item) => {
      const itemSizeMB = parseSizeToMB(item.size)
      const itemSizeGB = itemSizeMB / 1024
      return itemSizeGB >= minSize && itemSizeGB <= maxSize
    })
  }, [searchResults, activeSource, minSize, maxSize])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    if (selectedScrapers.length === 0) {
      toast.error("请至少选择一个爬虫")
      return
    }

    setIsLoading(true)
    showLoader(`正在搜索 "${searchQuery}" 相关的磁力链接...`)
    setError(null)
    setSearchResults(null)
    setSelectedResult(null)

    try {
      const params = new URLSearchParams({ sort: "0" })
      selectedScrapers.forEach((source) => params.append("sources", source))
      const url = `/api/download/torrents/search/${encodeURIComponent(searchQuery)}?${params.toString()}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Error: ${response.statusText}`)
      const data: ApiResponse = await response.json()
      setSearchResults(data)

      const sources = Object.keys(data.data)
      if (sources.length > 0) {
        setActiveSource(sources[0])
        if (data.data[sources[0]].list.length > 0) {
          setSelectedResult(data.data[sources[0]].list[0])
        }
      }
      setHasSearched(true)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results.')
      setHasSearched(true)
    } finally {
      setIsLoading(false)
      hideLoader()
    }
  }

  const handleReset = () => {
    setHasSearched(false)
    setSearchQuery("")
    setSearchResults(null)
    setError(null)
  }

  const handleSourceChange = (source: string) => {
    setActiveSource(source)
    if (searchResults && searchResults.data[source]?.list.length > 0) {
      setSelectedResult(searchResults.data[source].list[0])
    }
  }

  const copyMagnet = (magnet: string) => {
    navigator.clipboard.writeText(magnet)
    toast.info('磁力已复制')
  }

  const toggleScraper = (scraperId: ScraperId) => {
    setSelectedScrapers((prev) => {
      if (prev.includes(scraperId)) {
        if (prev.length === 1) {
          toast.error("至少保留一个爬虫")
          return prev
        }
        return prev.filter((id) => id !== scraperId)
      }

      return [...prev, scraperId]
    })
  }

  const selectAllScrapers = () => {
    setSelectedScrapers(SCRAPER_OPTIONS.map((item) => item.id))
  }

  const renderScraperSelector = (compact = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-10 rounded-xl px-3" : "h-12"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="max-w-36 truncate">{selectedScraperLabel}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>选择搜索爬虫</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SCRAPER_OPTIONS.map((scraper) => (
            <DropdownMenuCheckboxItem
              key={scraper.id}
              checked={selectedScrapers.includes(scraper.id)}
              onClick={() => toggleScraper(scraper.id)}
            >
              {scraper.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-xs"
          onClick={selectAllScrapers}
        >
          全选
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex flex-col w-full h-full  bg-background text-foreground font-sans">

      {!hasSearched ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 animate-in fade-in duration-500">

          <div className="mb-10 flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary))]">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">磁力搜索</h1>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-2xl relative mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex items-center w-full group">
                <Search className="absolute left-5 text-muted-foreground w-6 h-6 group-focus-within:text-primary transition-colors" />
                <Input
                  className="h-16 pl-14 pr-16 rounded-full text-lg shadow-lg border-muted bg-card/50 hover:bg-card focus-visible:ring-primary/50 transition-all"
                  placeholder="Search hash, name, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-12 h-12"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </Button>
              </div>
              <div className="flex justify-end sm:justify-start">
                {renderScraperSelector()}
              </div>
            </div>
          </form>

          {/* <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
            <span className="text-xs font-bold text-primary uppercase mr-2 tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Hot:
            </span>
            {["Linux ISO", "Open Source", "Public Domain 4K", "Blender Assets", "FLAC"].map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 px-3 py-1 transition-colors"
                onClick={() => {
                  setSearchQuery(tag)
                  handleSearch()
                }}
              >
                {tag}
              </Badge>
            ))}
          </div> */}
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in slide-in-from-bottom-4 duration-500">

          <div className="flex-none min-h-16 border-b bg-background/95 backdrop-blur px-4 py-3 sm:px-6 flex flex-wrap items-center gap-3 z-20">
            <div className="flex items-center gap-2 cursor-pointer mr-2" onClick={handleReset}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  className="pl-9 pr-12 bg-muted/50 border-transparent focus-visible:bg-background transition-colors"
                  placeholder="Refine search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              {renderScraperSelector(true)}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
                <LayoutGrid className="w-4 h-4" />
                View
              </Button> */}
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-md bg-red-100 p-8 text-center text-red-500 dark:bg-red-900/20">
              <p><strong>搜索出错:</strong> {error}</p>
            </div>
          )}

          {searchResults && !error && (
            <div className="flex flex-1 overflow-hidden">
              <aside className="w-64 bg-card/30 border-r hidden lg:flex flex-col overflow-y-auto">
                <div className="p-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h2>
                    <Button variant="link" className="text-xs h-auto p-0 text-primary" onClick={() => { setMinSize(0); setMaxSize(100) }}>Reset</Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-mono">{minSize} - {maxSize} GB</span>
                      </div>
                      <Slider value={[maxSize]} onValueChange={(v) => setMaxSize(Array.isArray(v) ? v[0] : v)} max={100} step={1} className="py-2" />
                    </div>

                    <Separator />

                    <Accordion  defaultValue={["quality", "source"]} className="w-full">
                      <AccordionItem value="quality" className="border-none">
                        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">Quality</AccordionTrigger>
                        <AccordionContent className="pt-1 pb-2 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="4k" defaultChecked />
                            <label htmlFor="4k" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">4K UHD</label>
                            <span className="text-xs text-muted-foreground font-mono">124</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="1080p" />
                            <label htmlFor="1080p" className="text-sm font-medium leading-none flex-1">1080p</label>
                            <span className="text-xs text-muted-foreground font-mono">852</span>
                          </div>
                        </AccordionContent>
                      </AccordionItem>


                    </Accordion>
                  </div>
                </div>
              </aside>

              <main className="flex-1 flex flex-col min-w-0 bg-background relative">
                <div className="border-b px-4 py-3">
                  <Tabs value={activeSource} onValueChange={handleSourceChange}>
                    <TabsList className="bg-muted/50">
                      {Object.keys(searchResults.data).map((source) => (
                        <TabsTrigger key={source} value={source} className="gap-2">
                          {source}
                          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                            {searchResults.data[source].count}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b px-4 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-12 sm:col-span-6 flex items-center gap-2 cursor-pointer hover:text-foreground">
                    Name <ChevronDown className="w-3 h-3" />
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right">Size</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">Date</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">热度</div>
                </div>

                <ScrollArea className="flex-1 h-full">
                  <div className="p-2 space-y-1 min-h-0">
                    {filteredResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedResult(result)}
                        className={cn(
                          "group relative grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-md cursor-pointer transition-colors border",
                          selectedResult === result
                            ? "bg-accent text-accent-foreground border-primary/50"
                            : "bg-card/40 border-transparent hover:bg-muted hover:border-border"
                        )}
                      >
                        <div className="col-span-12 sm:col-span-6 min-w-0">
                          <div className="flex items-center gap-3">
                            <FileArchive className={cn("w-5 h-5", selectedResult === result ? "text-primary" : "text-muted-foreground")} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">
                                {result.fileName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:block col-span-2 text-right font-mono text-xs text-muted-foreground">{result.size}</div>
                        <div className="hidden sm:block col-span-2 text-right font-mono text-xs text-muted-foreground">{result.createdAt}</div>
                        <div className="hidden sm:block col-span-2 text-right font-mono text-xs">
                          <span className="text-primary font-bold">{result.heat}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </main>

              <aside className="w-[360px] bg-card border-l hidden xl:flex flex-col z-10 shadow-xl">
                {selectedResult && (
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center border">
                          <FileArchive className="text-primary w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h2 className="text-sm font-bold leading-tight line-clamp-3">{selectedResult.fileName}</h2>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3 ">
                        <Card className="bg-muted shadow-none border-none py-2">
                          <CardContent className="p-3">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Size</div>
                            <div className="text-lg font-mono font-medium">{selectedResult.size}</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted shadow-none border-none py-2">
                          <CardContent className="p-3">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">热度</div>
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-mono font-bold">{selectedResult.heat}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div className="p-4 border-b bg-muted/10">
                      <div className="flex items-center gap-2 mb-3 bg-background p-2 rounded-md border text-xs text-muted-foreground font-mono">
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate flex-1">{selectedResult.magnet.substring(0, 30)}...</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyMagnet(selectedResult.magnet)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>

                      <Button className="w-full gap-2 font-bold shadow-md" onClick={() => copyMagnet(selectedResult.magnet)}>
                        <Copy className="w-4 h-4" />
                        Copy Magnet Link
                      </Button>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Button variant='outline' className=" gap-2 font-bold " onClick={() => setPreviewOpen(true)}>
                          <Eye className="w-4 h-4" />
                          磁力预览
                        </Button>
                        <Button variant='outline' className=" gap-2 font-bold " onClick={() => handleDownload({link:selectedResult.magnet,downloadImmediately:false})}>
                          <Plus className="w-4 h-4" />
                          添加任务
                        </Button>
                        <Button variant='outline' className=" gap-2 font-bold " onClick={() => handleDownload({link:selectedResult.magnet,downloadImmediately:true})}>
                          <Download className="w-4 h-4" />
                          立即下载
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col min-h-0 w-full">
                      <div className="px-6 py-3 border-b bg-muted/20">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">文件内容({selectedResult.fileList.length})</h3>
                      </div>

                      <ScrollArea className="flex-1 h-full ">
                        <div className="p-4 space-y-1 w-[360px]">
                          {selectedResult.fileList.length > 0 ? (
                            selectedResult.fileList.map((file, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger >
                                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors ">
                                    <File className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    <span className="text-xs">{truncateFileName(file)}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{file}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-xs italic">
                              文件列表暂不可用
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      )}
      <MagnetPreviewDialog
        magnetLink={selectedResult?.magnet || null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
