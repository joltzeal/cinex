/*
  Warnings:

  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `download_urls` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."download_urls" DROP CONSTRAINT "download_urls_documentId_fkey";

-- DropTable
DROP TABLE "public"."documents";

-- DropTable
DROP TABLE "public"."download_urls";

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentDownloadURL" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "documentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."DocumentDownloadStatus" NOT NULL DEFAULT 'undownload',
    "detail" JSONB,
    "subscribeDataIds" JSONB,
    "hash" TEXT,
    "type" TEXT,

    CONSTRAINT "DocumentDownloadURL_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentDownloadURL_documentId_idx" ON "public"."DocumentDownloadURL"("documentId");

-- AddForeignKey
ALTER TABLE "public"."DocumentDownloadURL" ADD CONSTRAINT "DocumentDownloadURL_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
