"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentDownloadStatus } from "@prisma/client";
import { useDebouncedCallback } from 'use-debounce';
import { SubscribeMovieStatusMap } from "@/constants/data";

const statusMap = {
  undownload: "未下载",
  downloading: '下载中',
  downloaded: '已下载',
}

export function DataTableToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('query') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentType = searchParams.get('type') || '';

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    // 当筛选时，重置到第一页
    if (name !== 'page') {
      params.delete('page');
    }
    return params.toString();
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    router.push(pathname + '?' + createQueryString('query', term));
  }, 300);

  const handleStatusChange = (status: string) => {
    // 'all' value means clearing the filter
    router.push(pathname + '?' + createQueryString('status', status === 'all' ? '' : status));
  };

  const handleTypeChange = (type: string) => {
    router.push(pathname + '?' + createQueryString('type', type === 'all' ? '' : type));
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="搜索标题..."
          defaultValue={currentQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select value={currentType} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="按类型筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="movie">电影</SelectItem>
            <SelectItem value="magnet">磁力/其他</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="按状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            {['undownload', 'downloading', 'downloaded'].map(status => (
              <SelectItem key={status} value={status}>{statusMap[status as keyof typeof statusMap] || status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}