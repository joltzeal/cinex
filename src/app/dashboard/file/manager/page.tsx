import { FileManagerClient } from "@/components/file-manager/file-manager-client";
import PageContainer from "@/components/layout/page-container";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { generateTreeFromPathWithBasePath, tagDirectoryNodes } from "@/lib/file-system";
import { getSetting, SettingKey } from "@/services/settings";
import { Terminal } from "lucide-react";
import path from 'path';

export const metadata = {
  title: 'Dashboard : 文件管理'
};

export default async function FileManagerPage() {

  const downloadDirectoryConfig = await getSetting(SettingKey.DirectoryConfig);
  const mediaPath = path.join(process.cwd(), 'media');
  const treeDataWithBasePath = await generateTreeFromPathWithBasePath(mediaPath);
  const taggedTree = tagDirectoryNodes(treeDataWithBasePath, downloadDirectoryConfig as any);
  return (
    <PageContainer>
      {taggedTree.length > 0 ? (
        <FileManagerClient initialData={taggedTree} />
      ) : (
        <Alert className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>目录为空或无法访问</AlertTitle>

        </Alert>
      )}
    </PageContainer>
  );
}