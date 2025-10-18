-- CreateTable
CREATE TABLE "ForumSubscribe" (
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
CREATE TABLE "ForumPost" (
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
    "forumSubscribeId" TEXT NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumSubscribe_forum_idx" ON "ForumSubscribe"("forum");

-- CreateIndex
CREATE INDEX "ForumSubscribe_lastChecked_idx" ON "ForumSubscribe"("lastChecked");

-- CreateIndex
CREATE UNIQUE INDEX "ForumSubscribe_thread_forum_key" ON "ForumSubscribe"("thread", "forum");

-- CreateIndex
CREATE INDEX "ForumPost_forumSubscribeId_idx" ON "ForumPost"("forumSubscribeId");

-- CreateIndex
CREATE INDEX "ForumPost_publishedAt_idx" ON "ForumPost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPost_forumSubscribeId_postId_key" ON "ForumPost"("forumSubscribeId", "postId");

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_forumSubscribeId_fkey" FOREIGN KEY ("forumSubscribeId") REFERENCES "ForumSubscribe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
