'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { ListOrdered, PlusCircle, Search } from 'lucide-react';
import { TransferMethod, TransferStatus, FileTransferLog } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { columns } from './columns';
import { FileTreeViewSelector } from './data-table-client';
import { FileTreeNode } from '@/types';
import { TreeDataItem } from '@/components/ui/tree-view';
import { toast } from 'sonner';


// --- Props 定义 ---

interface DataTableClientComponentProps {
  recordsData: FileTransferLog[];
  fileTreeData: FileTreeNode[];
}

interface ManualRecognitionDialogProps {
  fileTreeData: FileTreeNode[];
}


function ManualRecognitionDialog({ fileTreeData }: ManualRecognitionDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<TreeDataItem | null>(null);
  const [standardName, setStandardName] = React.useState('');
  const [transferMethod, setTransferMethod] = React.useState('MOVE');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("请先选择一个文件！");
      return;
    }
    
    if (!standardName.trim()) {
      toast.error("请输入番号！");
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('提交手动识别:', { file: selectedFile, standardName, transferMethod });
      const response = await fetch('/api/file/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: selectedFile, name: standardName, transferMethod }),
      });
      const result = await response.json();
      console.log(result);
      
      if (result.success) {
        toast.success('提交手动识别成功!');
        // 重置表单状态
        setSelectedFile(null);
        setStandardName('');
        setTransferMethod('hardlink');
        // 关闭弹窗
        setIsDialogOpen(false);
        // 刷新页面
        window.location.reload();
      } else {
        toast.error(result.message || '提交手动识别失败!');
      }
    } catch (error: any) {
      toast.error('提交手动识别失败: ' + error.message);
      console.error('提交手动识别失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (node: TreeDataItem) => {
    setSelectedFile(node);
    setIsDrawerOpen(false); // 选择文件后自动关闭抽屉
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild><Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />手动识别</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>手动识别</DialogTitle>
          <DialogDescription>选择一个文件并输入番号，将尝试进行匹配和整理。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-name" className="text-right">文件名</Label>
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                  {selectedFile ? <span className="truncate">{selectedFile.name}</span> : <span className="text-muted-foreground">从 下载 文件夹选择...</span>}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader><DrawerTitle>选择视频文件</DrawerTitle><DrawerDescription>从 下载 目录中选择一个文件。</DrawerDescription></DrawerHeader>
                <div className='p-4'><FileTreeViewSelector fileTreeData={fileTreeData} onFileSelect={handleFileSelect} /></div>
                <DrawerFooter><DrawerClose asChild><Button variant="outline">取消</Button></DrawerClose></DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="standard-name" className="text-right">番号</Label>
            <Input id="standard-name" value={standardName} onChange={(e) => setStandardName(e.target.value)} className="col-span-3" placeholder="例如：SSNI-888" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transfer-method" className="text-right">转移方式</Label>
            <Select value={transferMethod} onValueChange={setTransferMethod}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="选择一种方式" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HARDLINK">硬链接</SelectItem><SelectItem value="SOFTLINK">软链接</SelectItem>
                <SelectItem value="COPY">复制</SelectItem><SelectItem value="MOVE">移动</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '处理中...' : '提交'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 主组件：数据表格 ---

export function DataTableClientComponent({ recordsData, fileTreeData }: DataTableClientComponentProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data: recordsData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, globalFilter, rowSelection },
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索整理记录..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-10 w-full sm:w-[300px]" />
        </div>
        <div className="flex items-center gap-2">
          <ManualRecognitionDialog fileTreeData={fileTreeData} />
          <Button><ListOrdered className="mr-2 h-4 w-4" />整理队列</Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">无结果。</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">已选择 {table.getFilteredSelectedRowModel().rows.length} 行，共 {table.getFilteredRowModel().rows.length} 行。</div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>上一页</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>下一页</Button>
        </div>
      </div>
    </div>
  );
}