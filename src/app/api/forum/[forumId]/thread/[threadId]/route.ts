
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { proxyRequest } from '@/lib/proxyFetch';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getSehuatangSafeid, syncAndPaginateForum } from '@/lib/tasks/forum';
import { BASE_HEADER, FORUM_MAP, FORUMS } from '@/constants/data';

async function fetchSouthPlusTitle(threadId: string) {
  // https://www.south-plus.net/thread.php?fid-9.html
  const url = `${FORUM_MAP.southPlus}/thread.php?fid-${threadId}.html`;
  const response = await proxyRequest(url, {
    headers: BASE_HEADER,
  });
  if (!response.ok) {
    return { title: null, url: null };
  }
  const html = response.body;
  const $ = cheerio.load(html);
  const title = $('head title').text().trim().split(' - ')[0].trim();
  return { title, url: url };
}


async function fetchT66yTitle(threadId: string) {
  const url = new URL(FORUM_MAP.t66y);
  const params = {
    fid: threadId,
  }
  url.search = new URLSearchParams(params).toString();
  // const url = `${FORUM_MAP.t66y}/thread0806.php?fid=${threadId}`;
  const response = await proxyRequest(url.toString(), {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    }
  });
  if (!response.ok) {
    return { title: null, url: null };
  }
  const html = response.body;
  const $ = cheerio.load(html);
  
  // 辅助函数：从指定的 div.t 中提取标题
  const extractTitle = (divElement: cheerio.Cheerio<any>) => {
    // 在该 div 下找到第一个 table > th > a
    const firstTable = divElement.find('table').first();
    // 第一个 th
    const firstTh = firstTable.find('th').first();
    // 在该 th 下取直接子 a，并筛掉包含子元素（比如 <div>）的 a
    const anchor = firstTh.children('a').filter(function (this: any) {
      return $(this).children().length === 0; // 没有子元素，纯文本或纯文本节点
    }).first();
    const text = anchor.text().trim();
    return text || null;
  };

  // 先尝试第一个 div.t
  const firstDiv = $('div.t').eq(0);
  let title = extractTitle(firstDiv);
  
  // 如果第一个没有结果，尝试第二个 div.t
  if (!title) {
    const secondDiv = $('div.t').eq(1);
    title = extractTitle(secondDiv);
  }

  return { title: title || null, url: url.toString() };
}
async function fetchJavbusTitle(threadId: string) {
  // https://www.javbus.com/forum/forum.php?mod=forumdisplay&fid=2
  const url = `${FORUM_MAP.javbus}/forum/forum.php?mod=forumdisplay&fid=${threadId}`;
  const response = await proxyRequest(url, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'cookie': '4fJN_2132_seccodecShc7yEr=17725.25b92167b81413dbfe; PHPSESSID=nrgcgque5qpulmp3g8oc47hto6; 4fJN_2132_saltkey=mLY3YZ8n; 4fJN_2132_lastvisit=1760086569; 4fJN_2132_auth=4a54zq8O%2BdB1e43LaQtiny6W3IzQcGy8ClP%2B3CQsUFDJFC8rBgqjDmIelo4iwf3aOu40A%2FWBMbu05Kk6yUspeQBzORY; 4fJN_2132_lastcheckfeed=345825%7C1760090175; 4fJN_2132_seccodecSAaO0s1aQmB=12272.d2eca6d68110abdba3; 4fJN_2132_home_diymode=1; existmag=all; 4fJN_2132_nofavfid=1; 4fJN_2132_smile=4D1; 4fJN_2132_visitedfid=2D36; 4fJN_2132_viewid=tid_160164; 4fJN_2132_st_p=345825%7C1760428807%7Cf7cc2cbd49bffd01d6bfb4a15ca42f67; 4fJN_2132_sid=X4X40x; 4fJN_2132_lip=38.181.81.199%2C1760523738; 4fJN_2132_st_t=345825%7C1760547151%7C922c08cf7ea6ce06b8dae8252676a598; 4fJN_2132_forum_lastvisit=D_2_1760547151; 4fJN_2132_ulastactivity=4011vL1zD6bxAfnnyCQyNyWMGt2QY%2FqI%2F6jafGGbV%2BppSnRTsHGy; 4fJN_2132_sendmail=1; 4fJN_2132_lastact=1760547182%09forum.php%09ajax'
    }
  });
  if (!response.ok) {
    return { title: null, url: null };
  }
  const html = response.body;
  const $ = cheerio.load(html);
  const title = $('.forum_top_name h1 a').text().trim();
  return { title, url: url };
}


async function fetchSehuatangTitle(threadId: string) {
  const url = `https://www.sehuatang.net/forum-${threadId}-1.html`;

  const safeid = await getSehuatangSafeid();
  if (!safeid) {
    throw new Error('_safe获取失败');
  }



  const sehuatangResponse = await proxyRequest(url, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'cookie': `_safe=${safeid}`
    }
  });
  if (!sehuatangResponse.ok) {
    return { title: null, url: null };
  }
  const sehuatangHtml = sehuatangResponse.body;
  const sehuatang$ = cheerio.load(sehuatangHtml);
  const title = sehuatang$('h1.xs2 a').text().trim();
  return { title, url };
}
// https://hjd2048.com/2048/thread.php?fid=15
async function fetch2048Title(threadId: string) {
  const url = `https://hjd2048.com/2048/thread.php?fid=${threadId}&search=img`;
  const response = await proxyRequest(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'referer': 'https://hjd2048.com/'
    }
  });
  if (!response.ok) {
    return { title: null, url: null };
  }
  const html = response.body;
  const $ = cheerio.load(html);
  const title = $('#sonEle').text().trim()
  return { title, url };
}

export async function POST(request: Request,
  { params }: { params: Promise<{ forumId: string; threadId: string }> }
) {
  try {
    // 添加新的 Forum Subscribe
    const { forumId, threadId } = await params;
    if (!forumId || !threadId) {
      return NextResponse.json({ error: '论坛名称和分区ID是必填的' }, { status: 400 });
    }
    logger.info(`添加新的订阅: ${forumId}, ${threadId}`);
    if (!FORUMS.includes(forumId)) {
      return NextResponse.json({ error: '无效的论坛' }, { status: 400 });
    }
    const thread = await prisma.forumSubscribe.findUnique({
      where: {
        thread_forum: {
          thread: threadId,
          forum: forumId,
        },
      },
    });
    if (thread) {
      return NextResponse.json({ error: '该分区已存在' }, { status: 400 });
    }

    let title: string | null;
    let url: string | null;

    if (forumId === '2048') {
      const result = await fetch2048Title(threadId);
      title = result.title;
      url = result.url;
    } else if (forumId === 'sehuatang') {
      const result = await fetchSehuatangTitle(threadId);
      title = result.title;
      url = result.url;
    } else if (forumId === 'javbus') {
      const result = await fetchJavbusTitle(threadId);
      title = result.title;
      url = result.url;
    } else if (forumId === 't66y') {
      const result = await fetchT66yTitle(threadId);
      title = result.title;
      url = result.url;
    } else if (forumId === 'southPlus') {
      const result = await fetchSouthPlusTitle(threadId);
      title = result.title;
      url = result.url;
    }
    else {
      return NextResponse.json({ error: 'Invalid forum ID' }, { status: 400 });
    }

    if (!title || !url) {
      return NextResponse.json({ error: '无法添加订阅,获取分区名称失败' }, { status: 400 });
    }

    const subscribe = await prisma.forumSubscribe.create({
      data: {
        thread: threadId,
        forum: forumId,
        title: title,
        url: url
      },
    });
    syncAndPaginateForum(subscribe, 10);
    return NextResponse.json({ success: true, message: '分区添加成功' }, { status: 200 });
  } catch (error) {
    logger.error(`发生错误，添加新的订阅: ${error}`);
    return NextResponse.json({ error: '内部服务器错误', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ forumId: string; threadId: string }> }
) {
  try {
    // Hardcoded URL for now
    const { forumId, threadId } = await params;
    if (!forumId || !threadId) {
      return NextResponse.json({ error: 'Forum ID and thread ID are required' }, { status: 400 });
    }
    if (!FORUMS.includes(forumId)) {
      return NextResponse.json({ error: 'Invalid forum ID' }, { status: 400 });
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
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    const result = await syncAndPaginateForum(thread, 1);
    return NextResponse.json({
      data: result,
      message: `成功同步 ${1} 个帖子`
    });

  } catch (error) {
    logger.error(`发生错误，获取分区列表: ${error}`);
    return NextResponse.json({ error: '内部服务器错误', message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
