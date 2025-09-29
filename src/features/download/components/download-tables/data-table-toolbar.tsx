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

export function DataTableToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('query') || '';
  const currentStatus = searchParams.get('status') || '';

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

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="搜索标题..."
          defaultValue={currentQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="按状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            {Object.values(DocumentDownloadStatus).map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}