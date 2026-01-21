"use client";
import {
  ContextMenu, ContextMenuContent,
  ContextMenuItem, ContextMenuRadioGroup, ContextMenuTrigger
} from "@/components/ui/context-menu";
import { processForumContent } from "@/lib/forum/forum-content-processor";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ForumPost } from "@prisma/client";
const getValidMagnetLink = (text: string): string | null => {
  const trimmedText = text.trim();
  const magnetLinkRegex = /^magnet:\?xt=urn:btih:([a-fA-F0-9]{40})/;
  if (magnetLinkRegex.test(trimmedText)) return trimmedText;

  const btihHashRegex = /^[a-fA-F0-9]{40}$/i;
  if (btihHashRegex.test(trimmedText)) {
    return `magnet:?xt=urn:btih:${trimmedText.toLowerCase()}`;
  }
  return null;
};
function getForumUrl(forumId: string | undefined, postId: string, url: string): string | undefined {
  if (forumId === '2048') {
    return `https://hjd2048.com/2048/read.php?tid=${postId}`;
  } else if (forumId === 'sehuatang') {
    return `https://www.sehuatang.net/thread-${postId}-1-1.html`;
  } else if (forumId === 'javbus') {
    return `https://www.javbus.com/forum/forum.php?mod=viewthread&tid=${postId}`;
  } else if (forumId === 't66y') {
    return url;
  } else if (forumId === 'southPlus') {
    return `https://www.south-plus.net/read.php?tid=${postId}.html`;
  }
  return '#';
}
export function PostContext({ post,forum }: { post: ForumPost,forum: string }) {
  const [clickedImageUrl, setClickedImageUrl] = useState<string | null>(null);
  const [selectedMagnetLink, setSelectedMagnetLink] = useState<string | null>(null);
  const [clickedImageInfo, setClickedImageInfo] = useState<{
    src: string; // 用于下载的代理URL
    originalSrc: string; // 用于搜索的原始公共URL
  } | null>(null);
  
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    // Always reset state on a new right-click
    setClickedImageUrl(null);
    setSelectedMagnetLink(null);

    // --- Check for selected text first (PRIORITY 1) ---
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';

    if (selectedText) {
      const validMagnet = getValidMagnetLink(selectedText);
      if (validMagnet) {
        // We found a valid link/hash! Set the state and stop processing.
        setSelectedMagnetLink(validMagnet);
        return; // This prioritizes selected text over the element clicked
      }
    }

    // --- If no valid text was selected, check for an image click (PRIORITY 2) ---
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const imageElement = target as HTMLImageElement;
      setClickedImageUrl(imageElement.src);
      setClickedImageInfo({
        src: imageElement.src,
        originalSrc: imageElement.getAttribute('data-original-src') || ''
      });
    }
  };
  const handleSearchByImage = () => {
    if (!clickedImageInfo) return;

    // 使用原始的、可公开访问的 URL 进行搜索
    const imageUrl = clickedImageInfo.src;
    
    // 对 URL 进行编码，以防其中包含特殊字符
    const encodedUrl = encodeURIComponent(imageUrl);
    
    // 构建 Google Lens 的搜索 URL
    const searchUrl = `https://lens.google.com/uploadbyurl?url=${encodedUrl}`;
    
    // 在新标签页中打开链接
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };
  const handleSaveImage = () => {
  };
  const handleDownload = async () => {
    try {
      const magnetLinks = [selectedMagnetLink||''];
      // const magnetLinks = extractMagnetLinks(content);
      if (magnetLinks.length === 0) {
        toast.error("没有磁力链接");
        return;
      }
      const form = new FormData();
      form.append('title',post.title)
      form.append("downloadURLs", JSON.stringify(magnetLinks));
      const response = await fetch(`/api/download`, {
        method: "POST",
        body: form,
      });
      if (response.ok) {
        toast.success("下载任务已提交");
      } else {
        toast.error("下载失败");
      }
    }
      catch (error) {
      toast.error("下载失败");
    } finally {
    }
  }
  const handleAddMagnetDownload = () => {
    handleDownload();
  };

  const handleViewSourcePost = () => {
    
    // const forum = await 
    window.open(getForumUrl(forum as string, post.postId, post.url||''), '_blank', 'noopener,noreferrer');
  };

  const processedContent = useMemo(() => {
    return processForumContent(post.content, forum); // 假设 forumId 在这里
  }, [post.content, post.forumSubscribeId]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* <PostContentView htmlContent={processedContent||''} /> */}
        {/* We attach the handler to this div */}
        <div className="" onContextMenu={handleContextMenu}>
          <div
            className="text-sm leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:mb-4 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4"
            dangerouslySetInnerHTML={{
              __html: processedContent||''
            }}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent >

        {/* 4. Conditionally render the "Download" option */}
        

        {/* Your other static context menu items */}
        {/* <ContextMenuCheckboxItem>Some other option</ContextMenuCheckboxItem> */}

        {clickedImageUrl && (
          <>
            <ContextMenuItem onClick={handleSearchByImage} inset>
                  以图搜图 (Google)
                </ContextMenuItem>
          </>
        )}
        {selectedMagnetLink && (
          <>
            <ContextMenuItem onClick={handleAddMagnetDownload} inset>
              添加到下载任务
            </ContextMenuItem>
            
          </>
        )}
        <ContextMenuRadioGroup value="pedro">
          {/* <ContextMenuLabel inset>People</ContextMenuLabel> */}
          
          <ContextMenuItem onClick={handleViewSourcePost} inset>
          查看源帖
                </ContextMenuItem>
          {/* <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem> */}
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}