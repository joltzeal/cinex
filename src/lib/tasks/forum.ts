import { ForumSubscribe } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '../logger';
import { proxyRequest } from "../proxyFetch";
import * as cheerio from "cheerio";
import { BASE_HEADER, FORUM_MAP } from '@/constants/data';
import { getCookieByWebsite } from '@/services/settings';

// 定义帖子数据类型
type ForumPost = {
    postId: string;
    title: string;
    url: string;
    cover: string | null;
    author: string | null;
    publishedAt: Date | null;
    forumSubscribeId: string;
};
let safeidCache = {
    value: null as string | null,
    expires: 0, // 使用时间戳来记录过期时间
};
export async function taskForumUpdate() {
    const taskName = '论坛更新';
    try {
        const forums = await prisma.forumSubscribe.findMany();
        for (const forum of forums) {
            logger.warn(`更新论坛: ${forum.forum}, 主题: ${forum.title}`);
            await syncAndPaginateForum(forum, 10);
        }
    } catch (error) {
        logger.error(`${taskName} 执行失败: ${error}`);
    }
}
// 缓存有效期为 10 分钟 (毫秒)
const CACHE_DURATION_MS = 10 * 60 * 1000;
export async function fetch2048PostDetail(postId: string) {
    const fetchPostId = postId;
    const url = `${FORUM_MAP.f2048}/2048/read.php?tid=${fetchPostId}`;
    const response = await proxyRequest(url, {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'referer': 'https://hjd2048.com/'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data, status: ${response.statusCode}`);
    }
    const html = response.body;
    const $ = cheerio.load(html);

    // 1. 提取发布时间
    const dateTimeStr = $(".fl.gray[title]").attr("title");
    const publishedAt = dateTimeStr ? new Date(dateTimeStr) : null;

    // 2. 提取帖子标题
    const title = $(".ts a").text().trim() || $("title").text().trim();

    // 3. 提取帖子内容
    const contentElement = $(".tpc_content");

    // 移除评论节点
    contentElement.find("*").contents().filter(function () {
        return this.type === "comment";
    }).remove();

    const content = contentElement.html()?.trim() || null;

    // 4. 提取作者信息
    const author = $(".r_two b a").first().text().trim() || null;
    return {
        content,
        publishedAt,
        title,
        author,
    }
}
export async function fetchJavbusPostDetail(postId: string) {
    // https://www.javbus.com/forum/forum.php?mod=viewthread&tid=162428&extra=page=1&filter=author&orderby=dateline
    const params = {
        mod: 'viewthread',
        tid: postId.toString(),
        page: '1',
        filter: 'author',
        orderby: 'dateline'
    };
    const url = new URL(FORUM_MAP.javbus);
    url.pathname = '/forum/forum.php';
    url.search = new URLSearchParams(params).toString();
    const cookie = await getCookieByWebsite('javbus');
    if (!cookie) {
        throw new Error('未设置 Javbus Cookie');
    }
    const response = await proxyRequest(url.toString(), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'referer': 'https://www.javbus.com/',
            'cookie': cookie
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data, status: ${response.statusCode}`);
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const dateTimeStr = $('.nthread_other .authi span.mr10').first().text().trim();
    const publishedAt = dateTimeStr ? new Date(dateTimeStr.trim().toString()) : null;
    const content = $(".pcb").first().html()?.trim() || null;
    return {
        content,
        publishedAt,
    }
}
export async function fetchT66yPostDetail(postId: string, url: string) {
    const response = await proxyRequest(url, {
        headers: BASE_HEADER
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data, status: ${response.statusCode}`);
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const content = $('.tpc_content').first().html()?.trim() || null;
    return {
        content,
    }
}
export async function fetchSehuatangPostDetail(postId: string) {
    // https://www.sehuatang.net/forum.php?mod=viewthread&tid=3071046&extra=page=1&filter=author&orderby=dateline
    const params = {
        mod: 'viewthread',
        tid: postId.toString(),
        page: '1',
        filter: 'author',
        orderby: 'dateline'
    };
    const url = new URL(FORUM_MAP.sehuatang);
    url.search = new URLSearchParams(params).toString();
    const safeid = await getSehuatangSafeid();
    const response = await proxyRequest(url.toString(), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'referer': 'https://www.sehuatang.net/',
            'cookie': `_safe=${safeid}`
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data, status: ${response.statusCode}`);
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const dateTimeStr = $(".pti").find('.authi em span[title]').attr('title');
    const publishedAt = dateTimeStr ? new Date(dateTimeStr.trim().toString()) : null;


    // 3. 提取帖子内容
    const contentElement = $(".t_fsz").first();

    // 修复图片 src 属性：将占位图替换为真实的 file 属性值
    contentElement.find('img[file]').each((_, imgElement) => {
        const img = $(imgElement);
        const fileUrl = img.attr('file');
        if (fileUrl) {
            img.attr('src', fileUrl);
        }
    });



    const content = contentElement.html()?.trim() || null;

    return {
        content,
        publishedAt,
    }
}
export async function fetchSouthPlusPostDetail(postId: string) {
    // https://www.south-plus.net/read.php?tid-2683256.html
    // 
    const url = `${FORUM_MAP.southPlus}/read.php?tid-${postId}.html`;
    // 需要 cookie
    const reqHeader = {
        ...BASE_HEADER,
        // 'cookie': SOUTH_PLUS_COOKIE
    }
    const response = await proxyRequest(url, {
        headers: reqHeader,
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data, status: ${response.statusCode}`);
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const content = $('.tpc_content').first().html()?.trim() || null;
    const publish = $('span.fl.gray').first().text().trim();
    let publishedAt = null;
    if (publish) {
        publishedAt = new Date(publish);
    }
    return {
        content,
        publishedAt,
    }
}
/**
 * 这是一个内部函数，用于从源头获取新的 safeid。
 * 原始函数被重命名为 fetchNewSafeid 以明确其作用。
 */
async function fetchNewSafeid(): Promise<string | null> {
    try {
        const response = await proxyRequest('https://www.sehuatang.net/forum-2-1.html', {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'dnt': '1',
                'pragma': 'no-cache',
                'priority': 'u=0, i',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
            },
        });

        const homeHtml = response.body;

        const pattern = /var\s+safeid='(.+?)';/;
        const match = homeHtml.match(pattern);

        if (match && match[1]) {
            return match[1];
        }

        return null;
    } catch (error) {
        logger.error(`Error fetching new safeid:${error}`);
        return null;
    }
}

/**
 * 获取 safeid，优先从服务器内存缓存中读取。
 * 如果缓存过期或不存在，则重新获取并更新缓存。
 *
 * @returns {Promise<string | null>} safeid 字符串或在失败时返回 null。
 */
export async function getSehuatangSafeid(): Promise<string | null> {
    const now = Date.now();

    // 检查缓存是否仍然有效
    if (safeidCache.value && now < safeidCache.expires) {
        return safeidCache.value;
    }

    // 如果缓存过期或不存在，获取新的 safeid
    const newSafeid = await fetchNewSafeid();

    if (newSafeid) {
        // 更新缓存和过期时间
        safeidCache = {
            value: newSafeid,
            expires: now + CACHE_DURATION_MS,
        };
        return newSafeid;
    } else {
        // 如果获取失败，可以考虑清除旧的缓存（如果存在）
        // 以确保下一次调用会再次尝试获取
        safeidCache.value = null;
        safeidCache.expires = 0;
        logger.error('无法获取新的 98 堂 safeid，缓存已清除。');
        return null;
    }
}

export async function fetchJavbusPost(threadId: string, page: number, forumSubscribeId: string): Promise<ForumPost[]> {
    // https://www.javbus.com/forum/forum.php?mod=forumdisplay&fid=2&filter=author&orderby=dateline

    const params = {
        mod: 'forumdisplay',
        fid: threadId.toString(),
        filter: 'author',
        orderby: 'dateline',
        page: page.toString()
    };
    const url = new URL(FORUM_MAP.javbus);
    url.pathname = '/forum/forum.php';
    url.search = new URLSearchParams(params).toString();
    const cookie = await getCookieByWebsite('javbus');
    if (!cookie) {
        throw new Error('未设置 Javbus Cookie');
    }
    const response = await proxyRequest(url.toString(), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            'cookie': cookie
        }
    });
    if (!response.ok) {
        logger.error(`无法获取 Javbus 分区 ${threadId} 的帖子列表，状态: ${response.statusCode}`);
        return [];
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const list = $('#threadlisttableid tbody[id^=normalthread]').toArray()
        .map((item) => {
            const _item = $(item); // 将当前 DOM 元素包装成 Cheerio 对象

            // 从 tbody 的 id 中提取 postId，例如 "normalthread_162455" -> "162455"
            const idAttr = _item.attr('id');
            const idMatch = idAttr?.match(/^normalthread_(\d+)$/);
            const postId = idMatch ? idMatch[1] : '';
            // 寻找 class 为 's' 的 <a> 标签来获取标题和链接
            const titleLink = _item.find('a.s');
            const title = titleLink.text().trim();

            // 注意：请根据实际情况确认域名是否正确
            const url = `https://www.javbus.com/forum/${titleLink.attr('href')}`;

            // 在 class 为 'author' 的 span 中找到作者链接并获取文本
            const author = _item.find('span.author a').first().text().trim();

            // 获取帖子的第一张缩略图作为封面
            // 图片位于 class 为 'post_infolist_tit' 的 div 下的 img 标签
            let cover = null;
            const excludedCovers = [
                'static/image/stamp/011.small.gif',
                'template/javbus/images/hot.jpg'
            ];

            // 1. 获取所有可能的封面图片元素
            const images = _item.find('.post_infolist_tit img').toArray();

            // 2. 遍历所有图片，找到第一个不被排除的
            for (const img of images) {
                const src = $(img).attr('src');
                if (src && !excludedCovers.includes(src)) {
                    // 3. 找到有效 src，拼接域名并跳出循环
                    // 注意：封面图片的域名是 javbus.com
                    cover = `https://www.javbus.com/forum/${src}`;
                    break;
                }
            }

            // 在 class 为 'dateline' 的 span 中找到带有 title 属性的子 span，获取其 title 值作为发布日期
            const publishedAtRaw = _item.find('span.dateline span').attr('title');
            const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;

            return {
                title,
                url,
                author,
                cover,
                publishedAt,
                forumSubscribeId, // 这个变量来自您的外部作用域
                postId: postId,
            };
        });
    return list;
}
/**
 * 获取 2048 论坛的帖子列表
 * @param threadId 主题ID
 * @param page 页码
 * @param forumSubscribeId 订阅ID
 * @returns 帖子数组
 */
export async function fetch2048Post(threadId: string, page: number, forumSubscribeId: string): Promise<ForumPost[]> {
    const url = `https://hjd2048.com/2048/thread.php?fid=${threadId}&search=img&page=${page}`;

    try {
        const response = await proxyRequest(url, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'referer': 'https://hjd2048.com/'
            }
        });

        if (!response.ok) {
            logger.error(`无法获取 2048 分区 ${threadId} 的帖子列表，状态: ${response.statusCode}`);
            return [];
        }

        const html = response.body;
        const $ = cheerio.load(html);

        const posts: ForumPost[] = [];

        $('div.colVideoList > div.video-elem').each((index, element) => {
            const titleAnchor = $(element).find('a.title');
            const title = titleAnchor.attr('title');
            const postUrl = titleAnchor.attr('href');

            if (!title || !postUrl) {
                return; // 跳过无效数据
            }

            // 从 URL 中提取帖子 ID
            const tidMatch = postUrl.match(/tid=(\d+)/);
            const postId = tidMatch ? tidMatch[1] : null;

            if (!postId) {
                return; // 必须有 postId
            }

            const imageSrc = $(element).find('div.img img').attr('src');
            const cover = imageSrc && imageSrc !== 'images/no.jpg' ? imageSrc : null;
            const author = $(element).find('div.text-muted a.text-dark').text().trim() || null;

            posts.push({
                postId,
                title,
                url: postUrl,
                cover,
                author,
                publishedAt: null,
                forumSubscribeId,
            });
        });

        return posts;
    } catch (error) {
        logger.error(`无法获取 2048 分区 ${threadId} 的帖子列表，错误: ${error}`);
        return [];
    }
}
async function fetchSouthPlusPost(threadId: string, page: number, forumSubscribeId: string): Promise<ForumPost[]> {
    const params = {
        fid: threadId.toString(),
        page: page.toString()
    };
    // https://www.south-plus.net/thread.php?fid=9&page=1
    const url = new URL(FORUM_MAP.southPlus);
    url.pathname = '/thread.php';
    url.search = new URLSearchParams(params).toString();

    const reqHeaders = {
        ...BASE_HEADER,
        // 'cookie': SOUTH_PLUS_COOKIE
    };
    const response = await proxyRequest(url.toString(), {
        method: 'POST',
        headers: reqHeaders,
        body: new URLSearchParams({
            'search': '1',
            'orderway': 'postdate',
            'asc': 'DESC'
        }).toString(),
    });
    if (!response.ok) {
        logger.error(`无法获取 南+论坛 分区 ${threadId} 的帖子列表，状态: ${response.statusCode}`);
        return [];
    }
    const html = response.body;
    const $ = cheerio.load(html);
    const table = $('tbody[style*="table-layout:fixed"]').first();

    if (!table.length) {
        return []
    }

    // 优先选择第二个 tr.tr2，如果不存在则选择第一个
    const firstTr2 = table.find('tr.tr2').eq(0);
    const secondTr2 = table.find('tr.tr2').eq(1);

    let targetTr2;
    if (secondTr2.length) {
        // 如果存在第二个，使用第二个
        targetTr2 = secondTr2;
    } else if (firstTr2.length) {
        // 如果不存在第二个但存在第一个，使用第一个
        targetTr2 = firstTr2;
    } else {
        // 如果都不存在，返回空数组
        logger.warn(`无法获取 南+论坛 分区 ${threadId} 的帖子列表，没有找到任何 tr.tr2`);
        return []
    }

    // 获取该 tr 之后的所有 tr（同级后续）
    const followingTrs = targetTr2.nextAll('tr');


    const list = followingTrs.toArray()
        .map((item) => {
            const _item = $(item);
            const titleAnchor = _item.find('h3 > a');

            // 提取标题
            const title = titleAnchor.text().trim();

            // 提取作者
            const author = _item.find('a.bl').text().trim();

            // 提取发布日期
            const publishedAt = _item.find('td.y-style > div.f10.gray2').text().trim();

            // 提取 Post ID
            const idAttr = _item.find('h3 > a').attr('id'); // e.g., "a_ajax_2683256"
            const postId = idAttr ? idAttr.split('_').pop() || null : null;

            // 提取并拼接 URL
            const relativeUrl = _item.find('h3 > a').attr('href'); // e.g., "read.php?tid-2683256.html"
            const url = relativeUrl ? `${FORUM_MAP.southPlus}/${relativeUrl}` : null;

            return {
                title,
                author,
                publishedAt: publishedAt ? new Date(publishedAt) : null,
                postId: postId!,
                url: url!,
                cover: null,
                forumSubscribeId,
            };
        });
    const res = list.filter(item => item.postId !== null && item.url !== null);
    return res;
}
async function fetchT66yPost(threadId: string, page: number, forumSubscribeId: string): Promise<ForumPost[]> {
    const url = new URL(FORUM_MAP.t66y);
    const params = {
        search: 'today',
        fid: threadId.toString(),
        page: page.toString()
    };
    url.search = new URLSearchParams(params).toString();


    // const url = `${FORUM_MAP.t66y}/thread0806.php?fid=${threadId}&page=${page}`;
    const response = await proxyRequest(url.toString(), {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        }
    });
    if (!response.ok) {
        logger.error(`无法获取 草榴社区 分区 ${threadId} 的帖子列表，状态: ${response.statusCode}`);
        return [];
    }
    const html = response.body;
    const $ = cheerio.load(html);

    // 比较两个 div.t 的长度，选择更长的那个
    const firstDiv = $('div.t').eq(0);
    const secondDiv = $('div.t').eq(1);

    // 通过 HTML 内容长度来判断哪个 div 更长
    const firstDivLength = firstDiv.html()?.length || 0;
    const secondDivLength = secondDiv.html()?.length || 0;
    // logger.info(firstDivLength);
    // 选择长度更长的 div
    const targetDiv = firstDivLength > secondDivLength ? firstDiv : secondDiv;

    // 在该 div 下选中第二个 table（同样索引从 0 开始）
    const targetTbody = targetDiv.find('table').eq(1);

    // 在该 table 下选中第二个 tbody
    const secondTbody = targetTbody.find('tbody').eq(1);
    // const content = secondTbody.find('td.t_f').text();
    const list = secondTbody.find('tr').toArray()
        .map((item) => {
            const _item = $(item);
            const title: string = _item.find('h3 > a').text();
            // 提取 URL
            const url: string | undefined = _item.find('h3 > a').attr('href');

            // 提取作者
            // const author: string = $('a.bl').text();

            // 提取 Post ID
            const postIdWithPrefix: string | undefined = _item.find('h3 > a').attr('id');
            const postId: string | null = postIdWithPrefix ? postIdWithPrefix.substring(1) : null;

            // 提取并转换发布时间
            // 获取第三个td元素下的第一个f12 div，再取其中span.s3的data-timestamp属性
            const thirdTd = _item.find('td').eq(2);
            const author: string = thirdTd.find('a.bl').text();
            const firstF12Div = thirdTd.find('div.f12').first();
            const timestampStr: string | undefined = firstF12Div.find('span').attr('data-timestamp');

            let publishedAt: Date | null = null;
            if (timestampStr) {
                // 移除末尾的 's' 并转换为数字
                const timestampInSeconds: number = parseInt(timestampStr.replace('s', ''), 10);
                // 乘以 1000 转换为毫秒并创建 Date 对象
                publishedAt = new Date((timestampInSeconds + 8 * 3600) * 1000);
            }


            return {
                title,
                url: `https://www.t66y.com${url}`,
                postId: postId!,
                author,
                publishedAt,
                forumSubscribeId,
                cover: null,
            };
        });
    return list;
}
/**
 * 获取色花堂论坛的帖子列表
 * @param threadId 主题ID（版块ID）
 * @param page 页码
 * @param forumSubscribeId 订阅ID
 * @returns 帖子数组
 */
export async function fetchSehuatangPost(threadId: string, page: number, forumSubscribeId: string): Promise<ForumPost[]> {
    // https://www.sehuatang.net/forum.php?mod=forumdisplay&fid=2&page=1
    // https://www.sehuatang.net/forum.php?mod=forumdisplay&fid=2&orderby=dateline&filter=author&page=2
    const params = {
        mod: 'forumdisplay',
        fid: threadId.toString(),
        orderby: 'dateline',
        filter: 'author',
        page: page.toString()
    };
    const url = new URL(FORUM_MAP.sehuatang);
    url.search = new URLSearchParams(params).toString();
    const safeid = await getSehuatangSafeid();
    logger.info(`获取 98 堂 分区 ${threadId} 的帖子列表，safeid: ${safeid}`);

    if (!safeid) {
        logger.error('无法获取 98 堂 safeid，无法获取帖子列表');
        return [];
    }
    try {
        const response = await proxyRequest(`https://www.sehuatang.net/forum.php?mod=forumdisplay&fid=${threadId}&orderby=dateline&filter=author&page=${page}`, {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'zh,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'priority': 'u=0, i',
                'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                
                // 'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                // 'accept-language': 'zh-CN,zh;q=0.9',
                // 'cache-control': 'no-cache',
                // 'dnt': '1',
                // 'pragma': 'no-cache',
                // 'priority': 'u=0, i',
                // 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                'cookie': `_safe=${safeid}`
            },
            throwHttpErrors: false
        });
        if (!response.ok) {
            logger.error(`无法获取 98 堂 分区 ${threadId} 的帖子列表，状态: ${response.statusCode}`);
            return [];
        }

        const html = response.body;


        const $ = cheerio.load(html);

        const list = $('#threadlisttableid tbody[id^=normalthread]').toArray()
            .map((item) => {
                const _item = $(item);
                const hasCategory = _item.find('th em a').length;
                const publishedAt = _item.find('td.by').find('em span span').attr('title');
                const idAttr = _item.attr('id');
                const idMatch = idAttr?.match(/^normalthread_(\d+)$/);
                const postId = idMatch ? idMatch[1] : null;

                return {
                    title: `${hasCategory ? `[${_item.find('th em a').text()}]` : ''} ${_item.find('a.xst').text()}`,
                    url: `https://www.sehuatang.net${_item.find('a.xst').attr('href')}`,
                    author: _item.find('td.by cite a').first().text(),
                    cover: null,
                    publishedAt: publishedAt ? new Date(publishedAt) : null,
                    forumSubscribeId,
                    postId: postId!,
                };
            });
        return list;
    } catch (error) {
        logger.error(`无法获取 98 堂 分区 ${threadId} 的帖子列表，错误: ${error}`);
        return [];
    }
}
/**
 * 同步并分页获取论坛帖子
 * @param subscription 论坛订阅信息
 * @param maxPages 最大页数（可选）
 */
export async function syncAndPaginateForum(subscription: ForumSubscribe, maxPages?: number) {
    try {
        let page = 1;
        let shouldContinue = true;
        let allNewPosts: ForumPost[] = [];

        logger.warn(`开始同步 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表${maxPages ? ` (最大页数: ${maxPages})` : ''}`);

        while (shouldContinue) {
            // 检查是否达到最大页数
            if (maxPages && page > maxPages) {
                logger.info(`达到最大页数 (${maxPages})，停止分页。`);
                shouldContinue = false;
                break;
            }

            logger.info(`获取 ${subscription.forum} 分区 ${subscription.thread} 的第 ${page} 页帖子列表${maxPages ? `/${maxPages}` : ''}...`);

            try {
                // 根据论坛类型调用对应的获取函数
                let postsOnPage: ForumPost[] = [];

                if (subscription.forum === '2048') {
                    postsOnPage = await fetch2048Post(subscription.thread, page, subscription.id);
                } else if (subscription.forum === 'sehuatang') {
                    postsOnPage = await fetchSehuatangPost(subscription.thread, page, subscription.id);
                } else if (subscription.forum === 'javbus') {
                    postsOnPage = await fetchJavbusPost(subscription.thread, page, subscription.id);
                } else if (subscription.forum === 't66y') {
                    postsOnPage = await fetchT66yPost(subscription.thread, page, subscription.id);
                } else if (subscription.forum === 'southPlus') {
                    postsOnPage = await fetchSouthPlusPost(subscription.thread, page, subscription.id);
                } else {
                    logger.error(`不支持的论坛类型: ${subscription.forum}`);
                    break;
                }

                // 如果没有帖子，停止分页
                if (postsOnPage.length === 0) {
                    logger.info(`第 ${page} 页没有帖子，停止分页。`);
                    shouldContinue = false;
                    continue;
                }

                // 检查哪些帖子已存在于数据库中
                const postIdsOnPage = postsOnPage.map(p => p.postId);
                const existingPosts = await prisma.forumPost.findMany({
                    where: {
                        forumSubscribeId: subscription.id,
                        postId: {
                            in: postIdsOnPage,
                        },
                    },
                    select: {
                        postId: true,
                    },
                });

                const existingPostIdSet = new Set(existingPosts.map((p: ForumPost) => p.postId));

                // 过滤出新帖子
                const newPostsOnPage = postsOnPage.filter(p => !existingPostIdSet.has(p.postId));
                allNewPosts.push(...newPostsOnPage);

                // 停止条件：如果在当前页找到了已存在的帖子，说明已经同步到上次的位置
                if (existingPostIdSet.size > 0) {
                    logger.info(`第 ${page} 页有 ${existingPostIdSet.size} 个已存在的帖子，停止分页。`);
                    shouldContinue = false;
                } else {
                    // 只有当前页没有已存在的帖子时才继续下一页
                    page++;
                }

            } catch (error) {
                logger.error(`发生错误，同步 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表，第 ${page} 页: ${error}`);
                shouldContinue = false;
            }
        }

        // 批量插入所有新帖子
        if (allNewPosts.length > 0) {
            allNewPosts.reverse(); // 反转顺序，使最老的帖子先插入
            logger.info(`发现 ${allNewPosts.length} 个新帖子，插入到 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表。`);
            for (const post of allNewPosts) {
                try {
                    await prisma.forumPost.upsert({
                        where: {
                            forumSubscribeId_postId: {
                                forumSubscribeId: subscription.id,
                                postId: post.postId,
                            },
                        },
                        update: {
                            title: post.title,
                            url: post.url,
                            cover: post.cover,
                            author: post.author,
                            publishedAt: post.publishedAt,
                        },
                        create: post,
                    });
                } catch (error) {
                    logger.error(`无法插入帖子 ${post.postId}: ${error}`);
                }
            }
            await prisma.forumSubscribe.update({
                where: { id: subscription.id },
                data: { lastChecked: new Date() },
            });

        } else {
            logger.warn(`没有新帖子，停止同步 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表。`);
        }
        logger.warn(`${subscription.title}分区需要更新: ${allNewPosts.length}`);
        if (allNewPosts.length < 60 && allNewPosts.length > 0) {

            // 如果新帖子数量小于30，则更新所有新帖子详情
            for (const post of allNewPosts) {
                let updatedPost: any = null;
                if (subscription.forum === 'javbus') {
                    updatedPost = await fetchJavbusPostDetail(post.postId);
                }
                else if (subscription.forum === 'sehuatang') {
                    updatedPost = await fetchSehuatangPostDetail(post.postId);
                }
                else if (subscription.forum === '2048') {
                    updatedPost = await fetch2048PostDetail(post.postId);
                }
                else if (subscription.forum === 't66y') {
                    updatedPost = await fetchT66yPostDetail(post.postId, post.url);
                } else if (subscription.forum === 'southPlus') {
                    updatedPost = await fetchSouthPlusPostDetail(post.postId);
                }
                const result = await prisma.forumPost.update({
                    where: {
                        forumSubscribeId_postId: {
                            forumSubscribeId: subscription.id,
                            postId: post.postId,
                        },
                    },
                    data: {
                        ...updatedPost,
                    },
                })
            }

        }

        // 更新订阅的最后检查时间


        logger.warn(`同步完成，插入 ${allNewPosts.length} 个新帖子到 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表。`);

        return {
            subscriptionId: subscription.id,
            newPostsCount: allNewPosts.length,
        };
    } catch (error) {
        logger.error(`发生错误，同步 ${subscription.forum} 分区 ${subscription.thread} 的帖子列表: ${error}`);
        return {
            subscriptionId: subscription.id,
            newPostsCount: 0,
        };
    }

}