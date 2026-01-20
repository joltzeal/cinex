"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DocumentWithURLs } from "@/lib/download/download-data";
import { FullScreenImagePreview } from "./image-preview-cell";
import { DownloadProgressCell } from "./download-status-cell";
import { ActionsCell } from "./cell-action";



export const columns: ColumnDef<DocumentWithURLs>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(value) => table.toggleAllPageRowsSelected(!!value.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(value) => row.toggleSelected(!!value.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "images",
    header: "预览图",
    cell: ({ row }) => {
      const images = row.original.images;
      const proxyImages = images.map((image) => {
        if (image.startsWith("https://www.javbus")) {
          return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(image)}`
        }
        return image;
      });
      return <div className="w-16 h-16"><FullScreenImagePreview images={proxyImages} alt={row.original.title} /></div>;
    },
  },
  {
    accessorKey: "title",
    header: "标题",
    cell: ({ row }) => {
      return <div className="font-medium truncate w-150">{row.original.title}</div>;
    },
  },
  {
    accessorKey: "downloadURLs",
    header: "下载状态",
    cell: ({ row }) => {
      // 3. 使用新的进度条组件
      return <DownloadProgressCell  urls={row.original.downloadURLs} />;
    },
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => {
      return <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // 2. 使用 ActionsCell 组件
      return <ActionsCell document={row.original} />;
    },
  },
];