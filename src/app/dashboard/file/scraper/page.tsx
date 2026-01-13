import fs from 'fs';
import path from 'path';
import { FileTreeNode } from '@/types';
import { DataTableClientComponent } from './file-tree-view-selector';
import { prisma } from '@/lib/prisma';
import { videoExtensions } from '@/constants/data';
import PageContainer from '@/components/layout/page-container';



/**
 * 递归遍历目录并构建文件树 (仅包含视频文件和包含视频的文件夹)
 * @param dir - 当前要遍历的目录路径
 * @returns 返回一个文件树数组
 */
function getDirectoryTree(dir: string): FileTreeNode[] {
  const tree: FileTreeNode[] = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const children = getDirectoryTree(fullPath);
        if (children.length > 0) {
          tree.push({ id: fullPath, name: item.name, children });
        }
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (videoExtensions.includes(ext)) {
          tree.push({ id: fullPath, name: item.name });
        }
      }
    }
  } catch (error) {
    console.warn(`[Server Component] Could not read directory: ${dir}. It might not exist.`);
  }
  return tree;
}



export default async function OrganizeRecordsPage() {
  // 在服务端同时获取表格数据和文件树数据
  const transferLogs = await prisma.fileTransferLog.findMany(
    {
      orderBy: {
        initiatedAt: 'desc'
      },
    }
  );
  const recordsData = transferLogs;

  const mediaPath = path.join(process.cwd(), 'media');
  const fileTreeData = getDirectoryTree(mediaPath);


  return (
    <PageContainer >
      {/* 将两份数据都作为 props 传递给客户端组件 */}
      <DataTableClientComponent recordsData={recordsData} fileTreeData={fileTreeData} />
    </PageContainer>
  );
}
