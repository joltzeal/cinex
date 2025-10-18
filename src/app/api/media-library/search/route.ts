import { NextRequest, NextResponse } from 'next/server';
import { 
  findMediaItemByIdOrTitle, 
  getMediaLibraryCache,
  refreshMediaLibraryCache 
} from '@/lib/tasks/media-library';

/**
 * GET /api/media-library/search
 * 
 * 查询参数：
 * - id: 番号（如 SSIS-001）
 * - title: 标题（如 美女）
 * - refresh: 是否刷新缓存（true/false）
 * 
 * 示例：
 * - /api/media-library/search?id=SSIS-001
 * - /api/media-library/search?title=美女
 * - /api/media-library/search?id=SSIS-001&refresh=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');
    const title = searchParams.get('title');
    const shouldRefresh = searchParams.get('refresh') === 'true';

    // 参数验证
    if (!sourceId && !title) {
      return NextResponse.json(
        { error: '必须提供 id 或 title 参数' },
        { status: 400 }
      );
    }

    // 如果请求刷新缓存
    if (shouldRefresh) {
      await refreshMediaLibraryCache();
    }

    // 查找媒体项
    const mediaItem = findMediaItemByIdOrTitle(sourceId || undefined, title || undefined);

    if (!mediaItem) {
      return NextResponse.json(
        { 
          error: '未找到匹配的媒体项',
          searchParams: { sourceId, title }
        },
        { status: 404 }
      );
    }

    // 返回媒体项信息
    return NextResponse.json({
      success: true,
      data: {
        id: mediaItem.Id,
        name: mediaItem.Name,
        originalTitle: mediaItem.OriginalTitle,
        type: mediaItem.Type,
        path: mediaItem.Path,
        year: mediaItem.ProductionYear,
        rating: mediaItem.CommunityRating,
        overview: mediaItem.Overview,
        premiereDate: mediaItem.PremiereDate,
      },
      cache: {
        totalItems: getMediaLibraryCache().items.length,
        lastUpdated: getMediaLibraryCache().lastUpdated,
      }
    });

  } catch (error) {
    console.error('[API] 媒体库查询失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', message: String(error) },
      { status: 500 }
    );
  }
}

