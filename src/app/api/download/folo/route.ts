import { corsJsonResponse, handleOptions } from "@/lib/cors";
import { downloadImmediatelyTask,createDownload } from "@/lib/download";
import { parsePost } from "@/lib/folo";
import { ensureMagnetLink, extractMagnetLinks } from "@/lib/magnet/magnet-helper";
import { getSetting, SettingKey } from "@/services/settings";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { DocumentDownloadURL } from "@prisma/client";
export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  try {

    const xml = await request.text(); // 拿到原始 XML
    let data = parsePost(xml)
    if (data.content_markdown) {
      data.content_markdown = data.content_markdown.replace(/\\n/g, "\n").replace(/\\t/g, "\t")
    } else {
      return corsJsonResponse({
        success: false,
        message: "没有提供有效的下载链接"
      }, 400);
    }


    const magnetLinks = extractMagnetLinks(data.content_markdown);
    console.log(magnetLinks);

    if (!magnetLinks.length) {
      return corsJsonResponse({
        success: false,
        message: "没有提供有效的下载链接"
      }, 400);
    }


    // 过滤有效的URL
    const validUrls = magnetLinks.filter((url: string) => url && url.trim() !== '');
    if (validUrls.length === 0) {
      return corsJsonResponse({
        success: false,
        message: "没有提供有效的下载链接"
      }, 400);
    }

    // // 检查重复链接
    const urlsToCheck = validUrls.map(url => ensureMagnetLink(url));
    const existingUrls = await prisma.documentDownloadURL.findMany({
      where: {
        url: {
          in: urlsToCheck,
        },
      },
      select: { url: true },
    });
    console.log(existingUrls);

    if (existingUrls.length > 0) {
      const duplicateUrls = existingUrls.map((item:DocumentDownloadURL) => item.url);
      return corsJsonResponse({
        success: false,
        message: `以下链接已存在: ${duplicateUrls.join(', ')}`
      }, 409);
    }
    const downloadImmediatelyConfig = await getSetting(SettingKey.DownloadRuleConfig);

    // downloadImmediately 默认为 true，只有当配置项明确为 false 时才不立即下载
    let downloadImmediatelySetting = true;
    if (
      downloadImmediatelyConfig &&
      typeof downloadImmediatelyConfig === 'object' &&
      downloadImmediatelyConfig !== null &&
      'downloadMagnetImmediately' in downloadImmediatelyConfig
    ) {
      downloadImmediatelySetting = Boolean(
        (downloadImmediatelyConfig as any).downloadMagnetImmediately
      );
    }

  } catch (error) {
    console.error('外部下载请求处理失败:', error);
    return corsJsonResponse({
      success: false,
      message: error instanceof Error ? error.message : "服务器内部错误"
    }, 500);
  }
}
