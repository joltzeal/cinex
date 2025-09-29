'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function SubscribeActions() {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        const toastId = toast.loading('正在开始同步 Jellyfin 媒体库...'); // 使用 loading toast，体验更好

        try {
            const response = await fetch('/api/media-library');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.details || '同步失败');
            }

            // toast.success(`同步完成！发现 ${data.totalItemsFound || 0} 个媒体项。`, {
            //     id: toastId, // 更新 loading toast
            // });
            console.log('Sync API response:', data);

        } catch (error: any) {
            toast.error(`同步失败: ${error.message}`, {
                id: toastId, // 更新 loading toast
            });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Button onClick={handleSync} disabled={isSyncing} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                同步媒体库
            </Button>
            
        </div>
    );
}