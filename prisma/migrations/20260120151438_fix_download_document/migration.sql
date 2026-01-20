/*
  Warnings:

  - You are about to drop the column `subscribeDataIds` on the `DocumentDownloadURL` table. All the data in the column will be lost.
  - The `type` column on the `DocumentDownloadURL` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('magnet', 'http', 'ftp', 'p2p');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "movieId" TEXT;

-- AlterTable
ALTER TABLE "DocumentDownloadURL" DROP COLUMN "subscribeDataIds",
DROP COLUMN "type",
ADD COLUMN     "type" "LinkType" DEFAULT 'magnet';

-- CreateIndex
CREATE INDEX "Document_movieId_idx" ON "Document"("movieId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;
