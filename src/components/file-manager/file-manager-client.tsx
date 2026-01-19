'use client';

import TreeView, { TreeViewItemWithTags, TreeViewMenuItem } from "@/components/tree-view";
import { videoExtensions, imageExtensions } from "@/constants/data";
import { Download, Folder, Share2, Trash2, Film, Eye, Image as ImageIcon } from "lucide-react";
import path from "path";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// import { useGlobalLightbox } from "@/components/global-lightbox-provider";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface FileManagerClientProps {
  initialData: TreeViewItemWithTags[];
}

export function FileManagerClient({ initialData }: FileManagerClientProps) {
  const [data, setData] = useState(initialData);
  const [customIconMap, setCustomIconMap] = useState<Record<string, React.ReactNode>>({});
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<TreeViewItemWithTags[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // const { openLightbox } = useGlobalLightbox();

  const handleSelectionChange = (selectedItems: TreeViewItemWithTags[]) => {
    logger.info(`Selected items:${selectedItems.map(i => i.name)}`);
  };

  // 获取文件扩展名
  const getFileExtension = (filePath: string): string => {
    return path.extname(filePath).toLowerCase();
  };

  // 判断是否为视频文件
  const isVideoFile = (filePath: string): boolean => {
    return videoExtensions.includes(getFileExtension(filePath));
  };

  // 判断是否为图片文件
  const isImageFile = (filePath: string): boolean => {
    return imageExtensions.includes(getFileExtension(filePath));
  };

  // 下载文件
  const handleDownload = async (items: TreeViewItemWithTags[]) => {
    const fileItems = items.filter(item => item.type === 'file');
    
    if (fileItems.length === 0) {
      toast.error('请选择要下载的文件');
      return;
    }

    for (const item of fileItems) {
      try {
        // 使用 API 路由来下载文件
        const downloadUrl = `/api/media/${encodeURIComponent(item.id)}?download=true`;
        
        // 创建一个隐藏的 a 标签来触发下载
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = item.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`正在下载: ${item.name}`);
      } catch (error) {
        logger.error(`下载失败:${error}`, );
        toast.error(`下载失败: ${item.name}`);
      }
    }
  };

  // 预览文件
  const handlePreview = (items: TreeViewItemWithTags[]) => {
    if (items.length === 0) {
      toast.error('请选择要预览的文件');
      return;
    }

    const item = items[0]; // 只预览第一个选中的文件
    
    if (item.type !== 'file') {
      toast.error('只能预览文件');
      return;
    }

    const fileUrl = `/api/media/${encodeURIComponent(item.id)}`;

    if (isVideoFile(item.id)) {
      // 视频预览
      setCurrentVideoUrl(fileUrl);
      setVideoPreviewOpen(true);
    } else if (isImageFile(item.id)) {
      // 图片预览
      // openLightbox([{ src: fileUrl, alt: item.name }], 0);
    } else {
      toast.error('该文件类型不支持预览');
    }
  };

  // 删除文件
  const handleDelete = (items: TreeViewItemWithTags[]) => {
    if (items.length === 0) {
      toast.error('请选择要删除的项目');
      return;
    }
    setItemsToDelete(items);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToDelete) {
      try {
        const response = await fetch(`/api/file/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            path: item.id,
            isDirectory: item.type === 'folder' 
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        logger.error(`删除失败:${error}`, );
        errorCount++;
      }
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    
    if (successCount > 0) {
      toast.success(`成功删除 ${successCount} 个项目`);
      // 刷新数据
      window.location.reload();
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} 个项目删除失败`);
    }
  };

  const handleAction = (action: string, items: TreeViewItemWithTags[]) => {
    switch (action) {
      case 'download':
        handleDownload(items);
        break;
      case 'preview':
        handlePreview(items);
        break;
      case 'delete':
        handleDelete(items);
        break;
      default:
        alert(`Action: ${action} on ${items.length} items`);
    }
  };

  const handleCheckChange = (item: TreeViewItemWithTags, checked: boolean) => {
    const updateCheckedState = (items: TreeViewItemWithTags[], targetId: string, newChecked: boolean): TreeViewItemWithTags[] => {
      return items.map(i => {
        if (i.id === targetId) {
          const updateChildren = (children?: TreeViewItemWithTags[]): TreeViewItemWithTags[] | undefined => {
            return children?.map(child => ({
              ...child,
              checked: newChecked,
              children: updateChildren(child.children)
            }));
          };
          return { ...i, checked: newChecked, children: updateChildren(i.children) };
        }
        if (i.children) {
          return { ...i, children: updateCheckedState(i.children, targetId, newChecked) };
        }
        return i;
      });
    };
    setData(prevData => updateCheckedState(prevData, item.id, checked));
  };

  // 自定义图标获取函数
  const getCustomIcon = (item: TreeViewItemWithTags, depth: number) => {
    // 如果是一级目录（depth === 0），使用特殊图标
    if (depth === 0 && customIconMap[item.name]) {
      return customIconMap[item.name];
    }
    
    // 如果是文件夹，使用文件夹图标
    if (item.type === 'folder') {
      return customIconMap['folder'] || <Folder className="h-4 w-4 text-blue-500" />;
    } else if (item.type === 'file') {
      const ext = getFileExtension(item.id);
      if (videoExtensions.includes(ext)) {
        return customIconMap['video'] || <Film className="h-4 w-4 text-red-500" />;
      } else if (imageExtensions.includes(ext)) {
        return customIconMap['image'] || <ImageIcon className="h-4 w-4 text-green-500" />;
      } else {
        return customIconMap['file'] || <Download className="h-4 w-4 text-orange-500" />;
      }
    }
    
    // 如果是文件，使用文件图标
    return customIconMap['file'] || <Download className="h-4 w-4 text-orange-500" />;
  };
  
  const menuItems: TreeViewMenuItem[] = [
    { id: "preview", label: "预览", icon: <Eye className="h-4 w-4" />, action: (items) => handleAction('preview', items) },
    { id: "download", label: "下载", icon: <Download className="h-4 w-4" />, action: (items) => handleAction('download', items) },
    { id: "delete", label: "删除", icon: <Trash2 className="h-4 w-4 text-red-500" />, action: (items) => handleAction('delete', items) },
  ];

  return (
    <>
      <div className="w-full flex flex-col ">
        <TreeView
          title="文件管理"
          showCheckboxes={true}
          checkboxLabels={{
            check: "选中",
            uncheck: "取消选中",
          }}
          selectionText="已选择"
          searchPlaceholder="搜索"
          showExpandAll={true}
          onCheckChange={handleCheckChange}
          onAction={handleAction}
          menuItems={menuItems}
          data={data}
          onSelectionChange={handleSelectionChange}
          getIcon={getCustomIcon}
        />
      </div>

      {/* 视频预览对话框 */}
      <Dialog open={videoPreviewOpen} onOpenChange={setVideoPreviewOpen}>
        <DialogContent className="w-[70vh]">
          <DialogHeader>
            <DialogTitle>视频预览</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
            <video
              src={currentVideoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除以下 {itemsToDelete.length} 个项目吗？此操作无法撤销。
              <div className="mt-2 max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside text-sm">
                  {itemsToDelete.map((item, index) => (
                    <li key={index} className="truncate">{item.name}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}