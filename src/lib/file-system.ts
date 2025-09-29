import fs from 'fs/promises';
import path from 'path';
import { TreeViewItem, TreeViewItemWithTags } from '@/components/tree-view';

/**
 * 递归扫描指定目录，并将其内容构建成 TreeView 所需的数据结构。
 * @param dirPath 要扫描的目录的绝对路径。
 * @returns 返回一个 Promise，解析为 TreeViewItem 数组。
 */
export async function generateTreeFromPath(dirPath: string): Promise<TreeViewItem[]> {
  try {
    // withFileTypes: true 让我们能直接判断是文件还是目录，无需额外调用 fs.stat
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    const nodes: TreeViewItem[] = [];

    for (const item of items) {
      // 忽略隐藏文件 (例如 .DS_Store)
      if (item.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      const node: TreeViewItem = {
        id: fullPath, // 使用完整路径作为唯一 ID
        name: item.name,
        type: item.isDirectory() ? 'folder' : 'file',
        // 在 data 属性中存储额外信息，非常有用
        // data: { 
        //   fullPath: fullPath,
        //   isDirectory: item.isDirectory()
        // }
      };

      if (item.isDirectory()) {
        // 如果是目录，则递归扫描
        node.children = await generateTreeFromPath(fullPath);
      }
      
      nodes.push(node);
    }
    
    // 排序：文件夹在前，文件在后，都按字母顺序排列
    nodes.sort((a, b) => {
      const aIsDir = a.children !== undefined;
      const bIsDir = b.children !== undefined;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    // 如果目录不存在或无权访问，返回空数组
    return [];
  }
}

export async function generateTreeFromPathWithBasePath(
  dirPath: string,
  basePath?: string
): Promise<TreeViewItem[]> {
  // 如果 basePath 未定义，说明是第一次调用，将当前 dirPath 设为 basePath
  const currentBasePath = basePath ?? dirPath;

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    const nodes: TreeViewItem[] = [];

    for (const item of items) {
      if (item.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      
      // 使用 path.relative 计算相对于根目录的路径
      const relativePath = path.relative(currentBasePath, fullPath);

      const node: TreeViewItem = {
        // 使用相对路径作为唯一 ID
        id: relativePath, 
        name: item.name,
        type: item.isDirectory() ? 'folder' : 'file',
      };

      if (item.isDirectory()) {
        // 递归调用时，必须传递 currentBasePath
        node.children = await generateTreeFromPathWithBasePath(fullPath, currentBasePath);
      }
      
      nodes.push(node);
    }
    
    nodes.sort((a, b) => {
      const aIsDir = a.type === 'folder'; // 使用 type 属性判断
      const bIsDir = b.type === 'folder';
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * 遍历树形结构，并根据目录配置为匹配的文件夹节点添加标签。
 * @param nodes - 由 generateTreeFromPath 生成的 TreeViewItem 数组。
 * @param config - 目录配置对象。
 * @returns 返回一个带有标签的新树形结构。
 */
export function tagDirectoryNodes(
  nodes: TreeViewItem[],
  config: any
): TreeViewItemWithTags[] {
  // 1. 预处理配置，创建一个路径到标签信息的映射，方便快速查找
  const pathMap = new Map<string, any[]>();

  for (const source in config) {
    const entry = config[source];
    
    // 处理 downloadDir
    if (entry.downloadDir) {
      // 规范化路径：移除开头的 '/'
      const normalizedPath = entry.downloadDir.startsWith('/')
        ? entry.downloadDir.substring(1)
        : entry.downloadDir;
        
      if (!pathMap.has(normalizedPath)) {
        pathMap.set(normalizedPath, []);
      }
      pathMap.get(normalizedPath)!.push({ type: 'downloadDir', mediaType: entry.mediaType, source });
    }

    // 处理 mediaLibraryDir
    if (entry.mediaLibraryDir) {
      const normalizedPath = entry.mediaLibraryDir.startsWith('/')
        ? entry.mediaLibraryDir.substring(1)
        : entry.mediaLibraryDir;
        
      if (!pathMap.has(normalizedPath)) {
        pathMap.set(normalizedPath, []);
      }
      pathMap.get(normalizedPath)!.push({ type: 'mediaLibraryDir', mediaType: entry.mediaType, source });
    }
  }

  // 2. 递归函数，用于遍历和标记节点
  function traverseAndTag(currentNodes: TreeViewItem[]): TreeViewItemWithTags[] {
    return currentNodes.map(node => {
      const taggedNode: TreeViewItemWithTags = { ...node };

      // 3. 仅对 'folder' 类型进行匹配
      if (taggedNode.type === 'folder' && pathMap.has(taggedNode.id)) {
        taggedNode.tags = pathMap.get(taggedNode.id);
      }

      // 如果有子节点，递归处理
      if (taggedNode.children) {
        taggedNode.children = traverseAndTag(taggedNode.children);
      }
      
      return taggedNode;
    });
  }

  return traverseAndTag(nodes);
}