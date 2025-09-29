'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, Eye, Download, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TorrentSearchResult } from '@/lib/scrapers/interface';

interface SourceData {
  count: number;
  list: TorrentSearchResult[];
}

interface SearchResultsTabsProps {
  data: {
    [source: string]: SourceData;
  };
  onPreviewMagnet: (magnet: string) => void;
}

export function SearchResultsTabs({ data, onPreviewMagnet }: SearchResultsTabsProps) {
  console.log(data);
  
  const handleCopyMagnet = (magnetLink: string) => {
    navigator.clipboard.writeText(magnetLink).then(() => {
      toast.success('磁力链接已复制到剪贴板！');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      toast.error('复制链接失败。');
    });
  };

  const handleAddDocument = async (magnetLink: string) => {
    const formData = new FormData();
    formData.append('downloadURLs', JSON.stringify([magnetLink]));
    formData.append('downloadImmediately', 'false');

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
        // 异步任务启动，更新 loader 文本并开始监听

        // **不隐藏 loader**，让 SSE 处理器来控制
      } else {
        // 同步创建成功
        toast.success(result.message || "文档创建成功！");

      }
    } catch (error: any) {
      console.error('[Submit] 错误:', error);
      toast.error(`发生错误: ${error.message}`);
    }
  };

  const handleAddDownload = async (magnetLink: string) => {
    try {
      const response = await fetch('/api/download/torrents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: magnetLink }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '添加下载失败');
      }

      toast.success('已添加到下载队列！');
    } catch (err: any) {
      console.error('Add download error:', err);
      toast.error(err.message || '添加下载失败');
    }
  };

  return (
    <Tabs defaultValue={Object.keys(data)[0] || ''} className="w-full">
      <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
        {Object.entries(data).map(([source, result]) => (
          <TabsTrigger key={source} value={source}>
            {source.toUpperCase()} ({result.count})
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.entries(data).map(([source, result]) => (
        <TabsContent key={source} value={source}>
          {result.count > 0 ? (
            <ScrollArea className="h-[80vh] rounded-md border">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[45%]">文件名</TableHead>
                    <TableHead className="w-[100px]">大小</TableHead>
                    <TableHead className="w-[110px]">添加日期</TableHead>
                    <TableHead className="w-[80px]">热度</TableHead>
                    <TableHead className="w-[110px]">最后下载</TableHead>
                    <TableHead className="w-[100px] text-center">文件列表</TableHead>
                    <TableHead className="w-[160px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.list.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium whitespace-normal break-words" title={item.fileName}>
                        {item.fileName}
                      </TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>{item.heat}</TableCell>
                      <TableCell>{item.recentDownloads}</TableCell>
                      <TableCell className="text-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" disabled={item.fileList.length === 0}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <ScrollArea className="h-72">
                              <div className="p-4 space-y-2 text-sm">
                                {item.fileList.map((file, i) => <div key={i} className="truncate">{file}</div>)}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => onPreviewMagnet(item.magnet)}>
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleAddDownload(item.magnet)}>
                          <Download className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCopyMagnet(item.magnet)}>
                          <Copy className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleAddDocument(item.magnet)}>
                          <Plus className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center p-16 text-muted-foreground">
              没有找到 {source} 相关的结果
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
