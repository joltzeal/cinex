'use client';

import TreeView, { TreeViewItemWithTags, TreeViewMenuItem } from "@/components/tree-view";
import { videoExtensions } from "@/constants/data";
import { Download, Folder, Share2, Trash2, Film } from "lucide-react";
import path from "path";
import { useState, useEffect } from "react";

interface FileManagerClientProps {
  initialData: TreeViewItemWithTags[];
}

export function FileManagerClient({ initialData }: FileManagerClientProps) {
  const [data, setData] = useState(initialData);
  const [customIconMap, setCustomIconMap] = useState<Record<string, React.ReactNode>>({});


  const handleSelectionChange = (selectedItems: TreeViewItemWithTags[]) => {
    console.log("Selected items:", selectedItems.map(i => i.name));
  };

  const handleAction = (action: string, items: TreeViewItemWithTags[]) => {
    alert(`Action: ${action} on ${items.length} items: ${items.map(i => i.name).join(', ')}`);
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
      if (videoExtensions.includes(path.extname(item.id).toLowerCase())) {
        return customIconMap['video'] || <Film className="h-4 w-4 text-red-500" />;
      } else {
        return customIconMap['file'] || <Download className="h-4 w-4 text-orange-500" />;
      }
    }
    
    // 如果是文件，使用文件图标
    return customIconMap['file'] || <Download className="h-4 w-4 text-orange-500" />;
  };
  const menuItems: TreeViewMenuItem[] = [
    { id: "share", label: "分享", icon: <Share2 className="h-4 w-4" />, action: (items) => handleAction('share', items) },
    { id: "download", label: "下载", icon: <Download className="h-4 w-4" />, action: (items) => handleAction('download', items) },
    { id: "delete", label: "删除", icon: <Trash2 className="h-4 w-4 text-red-500" />, action: (items) => handleAction('delete', items) },
  ];

  return (
    
    <div className="w-full flex flex-col m-6" > {/* 示例：让它占据视口高度减去一些边距 */}
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
  );
}