// 文件路径: components/file-tree-view-selector.tsx
'use client';

import React from 'react';
import { TreeDataItem, TreeView } from '@/components/ui/tree-view';
import { FileTreeNode } from '@/types';


interface FileTreeViewSelectorProps {
  fileTreeData: FileTreeNode[];
  onFileSelect: (node: TreeDataItem) => void;
}

export function FileTreeViewSelector({ fileTreeData, onFileSelect }: FileTreeViewSelectorProps) {
  if (!fileTreeData || fileTreeData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center p-4 text-center text-muted-foreground">
        在项目的 'media' 目录中未找到任何视频文件或文件夹。
      </div>
    );
  }

  return (
    <div className="h-96 overflow-y-auto rounded-md border p-2">
      <TreeView
        data={fileTreeData}
        onSelectChange={(node) => {
          // 确保只在点击文件（而非文件夹）时触发回调
          if (node && !node.children) {
            console.log(node);
            
            onFileSelect(node);
          }
        }}
      />
    </div>
  );
}