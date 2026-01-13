import { NextRequest, NextResponse } from 'next/server';
import { 
  refreshMediaLibraryCache,
  getMediaLibraryCache 
} from '@/lib/tasks/media-library';

/**
 * GET /api/media-library/cache
 * 获取缓存状态
 */
export async function GET() {
  try {
    const cache = getMediaLibraryCache();
    
    return NextResponse.json({
      success: true,
      data: {
        totalItems: cache.items.length,
        lastUpdated: cache.lastUpdated,
        isEmpty: cache.items.length === 0,
        // 提供前 5 个媒体项作为示例
        samples: cache.items.slice(0, 5).map(item => ({
          id: item.Id,
          name: item.Name,
          type: item.Type,
        }))
      }
    });

  } catch (error) {
    console.error('[API] 获取缓存状态失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误', message: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media-library/cache
 * 刷新缓存
 */
export async function POST() {
  try {
    const startTime = Date.now();
    
    await refreshMediaLibraryCache();
    
    const duration = Date.now() - startTime;
    const cache = getMediaLibraryCache();
    
    return NextResponse.json({
      success: true,
      message: '缓存刷新成功',
      data: {
        totalItems: cache.items.length,
        lastUpdated: cache.lastUpdated,
        duration: `${duration}ms`,
      }
    });

  } catch (error) {
    console.error('[API] 刷新缓存失败:', error);
    return NextResponse.json(
      { error: '缓存刷新失败', message: String(error) },
      { status: 500 }
    );
  }
}

