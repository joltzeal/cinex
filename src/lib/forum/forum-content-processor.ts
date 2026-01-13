/**
 * 论坛内容处理器
 * 用于处理不同论坛的内容，特别是图片代理
 */

import * as cheerio from 'cheerio';

/**
 * 需要代理的域名配置
 */
const PROXY_DOMAINS: Record<string, string[]> = {
  
  'javbus': [
    'forum.javcdn.cc',
    // 添加其他需要代理的域名
  ],
};

/**
 * 检查 URL 是否需要代理
 */
function needsProxy(url: string, forumId: string): boolean {
  if (!url) return false;
  const domains = PROXY_DOMAINS[forumId];
  
  if (!domains) return false;

  try {
    const urlObj = new URL(url);
    return domains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * 生成代理 URL
 */
function getProxyUrl(imageUrl: string, forumId: string): string {
  return `/api/forum/${forumId}/proxy?url=${encodeURIComponent(imageUrl)}`;
}

/**
 * 处理 HTML 内容中的图片
 * @param htmlContent - HTML 内容字符串
 * @param forumId - 论坛 ID
 * @returns 处理后的 HTML 内容
 */
export function processForumContent(htmlContent: string | null, forumId: string): string | null {
  console.log('processForumContent', forumId);
  if (!htmlContent) return null;

  try {
    const $ = cheerio.load(htmlContent, {
      // decodeEntities: false, // 保持特殊字符不被解码
    });

    // 处理所有图片标签
    $('img').each((_, element) => {
      // console.log('img',element);
      
      const img = $(element);
      const src = img.attr('src');
      if (!src && img.attr('ess-data')) {
        img.attr('src', img.attr('ess-data'));
      }

      if (src === './images/thumb-ing.gif' && img.attr('data-original')) {
        img.attr('src', img.attr('data-original'));
        // return;
      }
      

      if (src && needsProxy(src, forumId)) {
        console.log(needsProxy(src, forumId));
        
        // 替换为代理 URL
        const proxyUrl = getProxyUrl(src, forumId);
        console.log('proxyUrl', proxyUrl);
        
        img.attr('src', proxyUrl);
        console.log(img);
        
        // 添加原始 URL 作为 data 属性，方便调试
        img.attr('data-original-src', src);
      }

      // 处理 srcset 属性（如果存在）
      const srcset = img.attr('srcset');
      if (srcset) {
        const newSrcset = srcset
          .split(',')
          .map(part => {
            const [url, descriptor] = part.trim().split(/\s+/);
            if (url && needsProxy(url, forumId)) {
              const proxyUrl = getProxyUrl(url, forumId);
              return descriptor ? `${proxyUrl} ${descriptor}` : proxyUrl;
            }
            return part;
          })
          .join(', ');
        img.attr('srcset', newSrcset);
      }
    });

    // console.log('$.html()', $.html());
    

    // 处理背景图片（内联样式）
    $('[style*="background"]').each((_, element) => {
      const elem = $(element);
      const style = elem.attr('style');
      
      if (style) {
        const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
        const newStyle = style.replace(urlRegex, (match, url) => {
          if (needsProxy(url, forumId)) {
            const proxyUrl = getProxyUrl(url, forumId);
            return `url('${proxyUrl}')`;
          }
          return match;
        });
        elem.attr('style', newStyle);
      }
    });

    return $.html();
  } catch (error) {
    console.error('Error processing forum content:', error);
    // 如果处理失败，返回原始内容
    return htmlContent;
  }
}

/**
 * 批量处理论坛内容
 */
export function batchProcessForumContent(
  contents: Array<{ content: string | null; forumId: string }>
): Array<string | null> {
  return contents.map(({ content, forumId }) => processForumContent(content, forumId));
}

