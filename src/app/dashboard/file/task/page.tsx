import { CreateDocumentDialog } from '@/features/download/components/create-document-form';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { DocumentsTable } from '@/features/download/components/documents-table';

import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: 下载任务'
};

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};


export default async function Page({ searchParams }: PageProps) {

  return (
    <PageContainer scrollable={true}>
      <div className="w-full">
      <div className='flex flex-1 flex-col space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Download Board'
            description='Manage Download Tasks'
          />
          <CreateDocumentDialog></CreateDocumentDialog>
        </div>
        <Separator />
        <Suspense
          fallback={
            <DataTableSkeleton columnCount={5} rowCount={8} filterCount={2} />
          }
        >
          <DocumentsTable  searchParams={searchParams}
          />
        </Suspense>
      </div>
      </div>
    </PageContainer>
  );
}