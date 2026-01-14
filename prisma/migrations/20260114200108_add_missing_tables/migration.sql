-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "MovieStatus" AS ENUM ('uncheck', 'checked', 'undownload', 'downloading', 'downloaded', 'added', 'subscribed', 'transfered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "DocumentDownloadStatus" AS ENUM ('undownload', 'downloading', 'downloaded', 'paused', 'checking', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "TransferStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PROCESSING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "TransferMethod" AS ENUM ('COPY', 'MOVE', 'HARDLINK', 'SOFTLINK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Document" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentDownloadURL" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "documentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "DocumentDownloadStatus" NOT NULL DEFAULT 'undownload',
    "detail" JSONB,
    "subscribeDataIds" JSONB,
    "hash" TEXT,
    "type" TEXT,
    "downloadAt" TIMESTAMP(3),
    "number" TEXT,

    CONSTRAINT "DocumentDownloadURL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Subscribe" (
    "id" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "starInfo" JSONB,
    "filterType" TEXT NOT NULL,
    "filterValue" TEXT NOT NULL,

    CONSTRAINT "Subscribe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Movie" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover" TEXT,
    "poster" TEXT,
    "date" TEXT,
    "tags" JSONB,
    "status" "MovieStatus" NOT NULL DEFAULT 'uncheck',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rating" TEXT,
    "comment" TEXT,
    "detail" JSONB,
    "magnets" JSONB,
    "mediaLibrary" JSONB,
    "addedAt" TIMESTAMP(3),
    "downloadAt" TIMESTAMP(3),
    "subscribeAt" TIMESTAMP(3),

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SubscribeMovie" (
    "id" TEXT NOT NULL,
    "subscribeId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscribeMovie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumSubscribe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "forum" TEXT NOT NULL,
    "thread" TEXT NOT NULL,
    "url" TEXT,
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumSubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ForumPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT,
    "author" TEXT,
    "cover" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isStar" BOOLEAN NOT NULL DEFAULT false,
    "readed" BOOLEAN NOT NULL DEFAULT false,
    "forumSubscribeId" TEXT NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FileTransferLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "transferMethod" "TransferMethod" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramMessage" (
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
CREATE INDEX IF NOT EXISTS "DocumentDownloadURL_documentId_idx" ON "DocumentDownloadURL"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Movie_number_key" ON "Movie"("number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubscribeMovie_subscribeId_idx" ON "SubscribeMovie"("subscribeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubscribeMovie_movieId_idx" ON "SubscribeMovie"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SubscribeMovie_subscribeId_movieId_key" ON "SubscribeMovie"("subscribeId", "movieId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumSubscribe_forum_idx" ON "ForumSubscribe"("forum");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumSubscribe_lastChecked_idx" ON "ForumSubscribe"("lastChecked");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ForumSubscribe_thread_forum_key" ON "ForumSubscribe"("thread", "forum");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumPost_forumSubscribeId_idx" ON "ForumPost"("forumSubscribeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumPost_publishedAt_idx" ON "ForumPost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ForumPost_forumSubscribeId_postId_key" ON "ForumPost"("forumSubscribeId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramMessage_messageId_chatId_key" ON "TelegramMessage"("messageId", "chatId");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "DocumentDownloadURL" ADD CONSTRAINT "DocumentDownloadURL_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "SubscribeMovie" ADD CONSTRAINT "SubscribeMovie_subscribeId_fkey" FOREIGN KEY ("subscribeId") REFERENCES "Subscribe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "SubscribeMovie" ADD CONSTRAINT "SubscribeMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_forumSubscribeId_fkey" FOREIGN KEY ("forumSubscribeId") REFERENCES "ForumSubscribe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
