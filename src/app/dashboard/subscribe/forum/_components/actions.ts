
"use server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {  proxyRequest } from "@/lib/proxyFetch";
import { revalidatePath } from "next/cache";
import * as cheerio from 'cheerio';

export async function syncForumThread(forumId: string, threadId: string) {
  try {
    if (!forumId || !threadId) {
      throw new Error("Forum ID and thread ID are required");
    }
    if (!['2048'].includes(forumId)) {
      throw new Error("Invalid forum ID");
    }

    const thread = await prisma.forumSubscribe.findUnique({
      where: {
        thread_forum: {
          thread: threadId,
          forum: forumId,
        },
      },
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    const url = `https://hjd2048.com/2048/thread.php?fid=${threadId}&search=img&page=1`;
    const response = await proxyRequest(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'referer': 'https://hjd2048.com/'
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data from source");
    }

    const html = response.body;
    const $ = cheerio.load(html);

    const postsToCreate: Array<{
      postId: string;
      title: string;
      url: string;
      cover: string | null;
      author: string | null;
      publishedAt: Date | null;
      forumSubscribeId: string;
    }> = [];

    $('div.colVideoList > div.video-elem').each((index, element) => {
      const titleAnchor = $(element).find('a.title');
      const title = titleAnchor.attr('title');
      const url = titleAnchor.attr('href');
      
      if (!title || !url) return;

      const tidMatch = url.match(/tid=(\d+)/);
      const postId = tidMatch ? tidMatch[1] : null;
      
      if (!postId) return;

      const imageSrc = $(element).find('div.img img').attr('src');
      const cover = imageSrc && imageSrc !== 'images/no.jpg' ? imageSrc : null;
      const author = $(element).find('div.text-muted a.text-dark').text().trim() || null;
      
      postsToCreate.push({
        postId,
        title,
        url,
        cover,
        author,
        publishedAt: null, // Date parsing logic removed for simplicity in action
        forumSubscribeId: thread.id,
      });
    });

    for (const post of postsToCreate) {
      await prisma.forumPost.upsert({
        where: {
          forumSubscribeId_postId: {
            forumSubscribeId: thread.id,
            postId: post.postId,
          },
        },
        update: {
          title: post.title,
          url: post.url,
          cover: post.cover,
          author: post.author,
        },
        create: post,
      });
    }

    await prisma.forumSubscribe.update({
      where: { id: thread.id },
      data: { lastChecked: new Date() },
    });
    
    revalidatePath(`/dashboard/subscribe/forum`);

    return { success: true, message: `Successfully synced ${postsToCreate.length} posts.` };

  } catch (error: any) {
    logger.error(`Failed to sync thread ${threadId}: ${error.message}`);
    return { success: false, message: error.message || "An internal server error occurred" };
  }
}
