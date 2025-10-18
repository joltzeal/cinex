-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('uncheck', 'checked', 'undownload', 'downloading', 'downloaded', 'added', 'subscribed', 'transfered');

-- CreateEnum
CREATE TYPE "DocumentDownloadStatus" AS ENUM ('undownload', 'downloading', 'downloaded', 'paused', 'checking', 'error');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PROCESSING');

-- CreateEnum
CREATE TYPE "TransferMethod" AS ENUM ('COPY', 'MOVE', 'HARDLINK', 'SOFTLINK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "password" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDownloadURL" (
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
CREATE TABLE "Subscribe" (
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
CREATE TABLE "Movie" (
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
    "detail" JSONB,
    "magnets" JSONB,
    "mediaLibrary" JSONB,
    "addedAt" TIMESTAMP(3),
    "downloadAt" TIMESTAMP(3),

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscribeMovie" (
    "id" TEXT NOT NULL,
    "subscribeId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscribeMovie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FileTransferLog" (
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
CREATE TABLE "TelegramMessage" (
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "DocumentDownloadURL_documentId_idx" ON "DocumentDownloadURL"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_number_key" ON "Movie"("number");

-- CreateIndex
CREATE INDEX "SubscribeMovie_subscribeId_idx" ON "SubscribeMovie"("subscribeId");

-- CreateIndex
CREATE INDEX "SubscribeMovie_movieId_idx" ON "SubscribeMovie"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscribeMovie_subscribeId_movieId_key" ON "SubscribeMovie"("subscribeId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMessage_messageId_chatId_key" ON "TelegramMessage"("messageId", "chatId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDownloadURL" ADD CONSTRAINT "DocumentDownloadURL_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscribeMovie" ADD CONSTRAINT "SubscribeMovie_subscribeId_fkey" FOREIGN KEY ("subscribeId") REFERENCES "Subscribe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscribeMovie" ADD CONSTRAINT "SubscribeMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
