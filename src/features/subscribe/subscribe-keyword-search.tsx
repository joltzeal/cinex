'use client';

import { IconSearch, IconX } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQueryState } from 'nuqs';
import { useState, useEffect } from 'react';

export function SubscribeKeywordSearch() {
  const [search, setSearch] = useQueryState('search', {
    defaultValue: '',
    shallow: false // 确保触发页面重新渲染
  });
  const [inputValue, setInputValue] = useState(search || '');

  // 同步 URL 参数变化到 input
  useEffect(() => {
    setInputValue(search || '');
  }, [search]);

  const handleSearch = async () => {
    const trimmedValue = inputValue.trim();
    await setSearch(trimmedValue || null);
  };

  const handleClear = async () => {
    setInputValue('');
    await setSearch(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleBlur = () => {
    // 失焦时，如果值发生变化则触发搜索
    const trimmedValue = inputValue.trim();
    if (trimmedValue !== (search || '')) {
      handleSearch();
    }
  };

  return (
    <div className='relative'>
      <IconSearch className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
      <Input
        placeholder='搜索演员、系列...'
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className='h-9 w-[200px] pr-9 pl-9 md:w-[300px]'
      />
      {inputValue && (
        <Button
          variant='ghost'
          size='sm'
          onClick={handleClear}
          className='absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0'
        >
          <IconX className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}
