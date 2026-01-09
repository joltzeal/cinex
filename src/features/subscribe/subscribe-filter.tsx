'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Filter, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const filterTypeMap = {
  all: { label: '全部', icon: Filter },
  genre: { label: '类别', icon: Filter },
  director: { label: '导演', icon: Filter },
  studio: { label: '制作商', icon: Filter },
  label: { label: '发行商', icon: Filter },
  series: { label: '系列', icon: Filter },
  star: { label: '演员', icon: Filter }
};

export function SubscribeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get('filterType') || 'all';

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value === 'all') {
      params.delete('filterType');
    } else {
      params.set('filterType', value);
    }

    // 重置页码
    params.delete('page');

    router.push(`?${params.toString()}`);
  };

  return (
    <div className='flex items-center gap-2'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='h-8 border-dashed'>
            <Filter className='mr-2 h-4 w-4' />
            {currentFilter === 'all'
              ? '筛选类型'
              : filterTypeMap[currentFilter as keyof typeof filterTypeMap]
                  ?.label || currentFilter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[200px]'>
          <DropdownMenuLabel>筛选类型</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={currentFilter}
            onValueChange={handleFilterChange}
          >
            {Object.entries(filterTypeMap).map(([key, { label }]) => (
              <DropdownMenuRadioItem key={key} value={key}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {currentFilter !== 'all' && (
        <Button
          variant='ghost'
          size='sm'
          className='h-8 px-2'
          onClick={() => handleFilterChange('all')}
        >
          <X className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
