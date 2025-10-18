'use client'; // Mark this component as a client component

import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

// Define the type for your data
interface MediaItem {
  id: number;
  title: string;
  directory: string;
  transferMethod: string;
  timestamp: string;
  status: string;
}

interface MediaScrapingTableProps {
  data: MediaItem[];
  columns: any[]; // Using 'any' for simplicity based on the page's definition, but can be typed more strictly
}

// Using createColumnHelper for better type safety if needed, but
// for this example, we'll stick to the array of objects from the page for simplicity.
// const columnHelper = createColumnHelper<MediaItem>();

const MediaScrapingTable: React.FC<MediaScrapingTableProps> = ({ data, columns }) => {
  const [tableData, setTableData] = useState<MediaItem[]>(data);

  // Update table data if the prop changes (e.g., after a real data fetch)
  useEffect(() => {
    setTableData(data);
  }, [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg shadow-md overflow-hidden border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MediaScrapingTable;