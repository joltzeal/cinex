'use client';

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { READ_FILTER_QUERY_KEY, normalizeReadFilter, type ReadFilter } from "./read-filter";

export function ReadFilterToggle({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readFilter: ReadFilter = normalizeReadFilter(searchParams.get(READ_FILTER_QUERY_KEY));

  const handleChange = (nextValue: string[]) => {
    if (!nextValue || nextValue.length === 0) return;

    const nextFilter = nextValue[0] === 'unread' ? 'unread' : 'all';
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextFilter === 'unread') {
      nextSearchParams.set(READ_FILTER_QUERY_KEY, 'unread');
    } else {
      nextSearchParams.delete(READ_FILTER_QUERY_KEY);
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  return (
    <ToggleGroup
      value={[readFilter]}
      onValueChange={handleChange}
      variant="outline"
      size="default"
      className={cn("shrink-0", className)}
    >
      <ToggleGroupItem value="all" aria-label="全部">
        全部
      </ToggleGroupItem>
      <ToggleGroupItem value="unread" aria-label="未读">
        未读
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
