'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { READ_FILTER_QUERY_KEY } from "./read-filter";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");

  // 从 URL 中读取当前搜索关键词
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const readFilter = searchParams.get(READ_FILTER_QUERY_KEY);
      const readQuery = readFilter === 'unread' ? `&${READ_FILTER_QUERY_KEY}=unread` : '';
      router.push(`/dashboard/subscribe/forum?forumId=search&q=${encodeURIComponent(searchQuery.trim())}${readQuery}`);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    const readFilter = searchParams.get(READ_FILTER_QUERY_KEY);
    router.push(readFilter === 'unread' ? `/dashboard/subscribe/forum?${READ_FILTER_QUERY_KEY}=unread` : '/dashboard/subscribe/forum');
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <div className="relative">
        <Input
          type="text"
          placeholder="搜索标题或内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[200px] pr-8"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button type="submit" variant="outline" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
