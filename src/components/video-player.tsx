"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface VideoPlayerProps {
  url: string;
  fileName: string;
  onClose?: () => void;
}

export default function VideoPlayer({ url, fileName, onClose }: VideoPlayerProps) {
  const [isReady, setIsReady] = useState(false);

  // 处理播放器准备就绪
  const handleReady = () => {
    setIsReady(true);
    console.log('播放器准备就绪');
    console.log('视频URL:', url);
    console.log('文件名:', fileName);
  };

  // 处理播放开始
  const handlePlay = () => {
    console.log('视频开始播放');
  };

  // 处理播放暂停
  const handlePause = () => {
    console.log('视频暂停播放');
  };

  // 处理进度变化
  const handleProgress = (state: any) => {
    if (state.loaded !== undefined) {
      console.log(`视频加载进度: ${Math.round(state.loaded * 100)}%`);
    }
    if (state.played !== undefined) {
      console.log(`播放进度: ${Math.round(state.played * 100)}%`);
    }
  };

  // 处理开始播放
  const handleStart = () => {
    console.log('视频开始播放');
  };

  // 处理播放结束
  const handleEnded = () => {
    console.log('视频播放结束');
  };

  // 处理加载开始
  const handleLoadStart = () => {
    console.log('开始加载视频');
  };

  // 处理可以播放
  const handleCanPlay = () => {
    console.log('视频可以播放');
  };

  // 处理错误
  const handleError = (error: any) => {
    console.error('播放错误:', error);
    console.error('错误详情:', error);
    console.error('视频URL:', url);
    toast.error('视频播放失败: ' + (error?.message || '未知错误'));
  };

  // 添加调试信息
  useEffect(() => {
    console.log('VideoPlayer 组件初始化');
    console.log('URL:', url);
    console.log('fileName:', fileName);

    // 检查URL是否有效
    if (!url) {
      console.error('视频URL为空');
      toast.error('视频URL无效');
    }
  }, [url, fileName]);

  // 如果URL无效，显示错误信息
  if (!url) {
    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg font-medium">视频URL无效</p>
          <p className="text-sm text-gray-400 mt-2">无法加载视频文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <ReactPlayer
        src={url}
        width="100%"
        height="100%"
        controls={true}
        muted={false}
        playing={false}
        onReady={handleReady}
        onPlay={handlePlay}
        onPause={handlePause}
        onStart={handleStart}
        onEnded={handleEnded}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onProgress={handleProgress}
        onError={handleError}
        // 添加配置以确保视频能正确播放
        config={{
          file: {
            attributes: {
              crossOrigin: 'anonymous',
              preload: 'metadata'
            }
          }
        } as any}
      />
    </div>
  );
}
