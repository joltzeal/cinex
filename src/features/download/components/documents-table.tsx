import { getDocuments } from '@/lib/download/download-data';
import { DocumentsDataTable } from './download-tables';
import { columns } from './download-tables/columns';
import { DocumentDownloadStatus } from '@prisma/client';

type DocumentsTableProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export async function DocumentsTable({ searchParams }: DocumentsTableProps) {
  // 等待 searchParams Promise
  const params = await searchParams;

  // 在一个动态路由中，这里的解析现在是完全安全的
  const query = typeof params.query === 'string' ? params.query : undefined;
  const status = typeof params.status === 'string' && Object.values(DocumentDownloadStatus).includes(params.status as any) ? params.status as DocumentDownloadStatus : undefined;
  const type = typeof params.type === 'string' ? params.type as string : undefined;
  const page = typeof params.page === 'string' ? Number(params.page) : 1;
  const pageSize = typeof params.pageSize === 'string' ? Number(params.pageSize) : 10;

  const { documents, pageCount } = await getDocuments({ query, status, type,page, pageSize, });

  return (
    <DocumentsDataTable
      columns={columns}
      data={documents}
      pageCount={pageCount}
    />
  );
}