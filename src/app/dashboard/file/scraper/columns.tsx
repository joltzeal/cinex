'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowRight, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileTransferLog, TransferMethod, TransferStatus } from '@prisma/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
const statusMap = {
  [TransferStatus.SUCCESS]: { label: '成功', variant: 'default' },
  [TransferStatus.FAILURE]: { label: '失败', variant: 'destructive' },
  [TransferStatus.PROCESSING]: { label: '处理中', variant: 'secondary' },
}
const transferMethodMap = {
  [TransferMethod.COPY]: { label: '复制', variant: 'outline' },
  [TransferMethod.MOVE]: { label: '移动', variant: 'outline' },
  [TransferMethod.HARDLINK]: { label: '硬链接', variant: 'outline' },
  [TransferMethod.SOFTLINK]: { label: '软链接', variant: 'outline' },
}

export const columns: ColumnDef<FileTransferLog>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? undefined : false}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => (
      <div className="flex items-center gap-3 w-50">
        <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center text-muted-foreground shrink-0">🎬</div>
        <div>
          <div className="font-medium truncate w-50">{row.original.title}</div>
          <Tooltip>
            <TooltipTrigger ><div className="text-xs text-muted-foreground truncate w-50">{row.original.number}</div></TooltipTrigger>
            <TooltipContent>
              <p>{row.original.number}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    ),
  },
  {
    id: 'paths',
    header: '目录',
    cell: ({ row }) => (
      // 1. 主容器：使用 flex 和 items-center
      <div className="flex items-center gap-3 w-full">
        
        {/* 2a. 更大且独立的箭头图标 */}
        <ArrowDown className="h-6 w-6 text-primary shrink-0" />
  
        {/* 2b. 文本容器：垂直堆叠路径 */}
        <div className="flex flex-col text-xs text-muted-foreground gap-1 max-w-xs md:max-w-md lg:max-w-lg">
          <p className="truncate break-all">
            <span className="font-semibold text-foreground">来源</span> {row.original.sourcePath}
          </p>
          <p className="truncate break-all">
            <span className="font-semibold text-foreground">目标</span> {row.original.destinationPath}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'transferMethod',
    header: '转移方式',
    cell: ({ row }) => {
      return <Badge variant="default">{transferMethodMap[row.getValue('transferMethod') as TransferMethod].label}</Badge>;
    },
  },
  {
    accessorKey: 'updatedAt',
    header: '时间',
    cell: ({ row }) => {
      return <div>{new Date(row.getValue('updatedAt')).toLocaleString()}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = statusMap[status as TransferStatus].variant as 'default' | 'destructive' | 'secondary' | 'outline';
      return <Badge variant={variant}>{statusMap[status as TransferStatus].label}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const handleDelete = async () => {
        const response = await fetch(`/api/file/transfer/${row.original.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          toast.error('删除失败');
          return;
        }
        toast.success('删除成功');
        // 刷新页面以更新数据
        window.location.reload();
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger ><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.sourcePath)}>复制源路径</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.original.destinationPath)}>复制目标路径</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>删除记录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];