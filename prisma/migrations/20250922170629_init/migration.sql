-- CreateEnum
CREATE TYPE "public"."SubscribeMovieStatus" AS ENUM ('uncheck', 'checked', 'undownload', 'downloading', 'downloaded', 'added', 'subscribed');

-- CreateEnum
CREATE TYPE "public"."DocumentDownloadStatus" AS ENUM ('undownload', 'downloading', 'downloaded', 'paused', 'checking', 'error');

-- CreateEnum
CREATE TYPE "public"."TransferStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PROCESSING');

-- CreateEnum
CREATE TYPE "public"."TransferMethod" AS ENUM ('COPY', 'MOVE', 'HARDLINK', 'SOFTLINK');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "password" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."download_urls" (
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

    CONSTRAINT "download_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscribeJAVBus" (
    "id" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "starInfo" JSONB,
    "filterType" TEXT NOT NULL,
    "filterValue" TEXT NOT NULL,

    CONSTRAINT "SubscribeJAVBus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscribeData" (
    "id" TEXT NOT NULL,
    "subscribeId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT,
    "poster" TEXT,
    "date" TEXT,
    "tags" JSONB NOT NULL,
    "status" "public"."SubscribeMovieStatus" NOT NULL DEFAULT 'undownload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "detail" JSONB,
    "magnets" JSONB,
    "mediaLibrary" JSONB,

    CONSTRAINT "SubscribeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."FileTransferLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "transferMethod" "public"."TransferMethod" NOT NULL,
    "status" "public"."TransferStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TelegramMessage" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "chatId" TEXT,
    "chatTitle" TEXT,
    "text" TEXT,
    "tags" TEXT[],
    "forwardUrl" TEXT,
    "mediaType" TEXT,
    "fileName" TEXT,
    "filePath" TEXT[],
    "mediaCount" INTEGER DEFAULT 0,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "download_urls_documentId_idx" ON "public"."download_urls"("documentId");

-- CreateIndex
CREATE INDEX "SubscribeData_subscribeId_idx" ON "public"."SubscribeData"("subscribeId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscribeData_subscribeId_code_key" ON "public"."SubscribeData"("subscribeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "public"."Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMessage_messageId_chatId_key" ON "public"."TelegramMessage"("messageId", "chatId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."download_urls" ADD CONSTRAINT "download_urls_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubscribeData" ADD CONSTRAINT "SubscribeData_subscribeId_fkey" FOREIGN KEY ("subscribeId") REFERENCES "public"."SubscribeJAVBus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
