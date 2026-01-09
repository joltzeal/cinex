'use client';

import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function VideoPlayer({
  url,
  isOpen,
  onClose,
  title = '预告片'
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  console.log('VideoPlayer URL:', url);
  console.log('VideoPlayer isOpen:', isOpen);
  console.log('VideoPlayer playing:', playing);

  const handlePlayPause = () => {
    setPlaying(!playing);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      if (playing) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.volume = value[0];
    }
  };

  const handleMuteToggle = () => {
    setMuted(!muted);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.muted = !muted;
    }
  };

  const handleProgress = (state: any) => {
    if (!seeking) {
      setPlayed(state.played);
    }
    setLoaded(state.loaded);
  };

  const handleSeek = (value: number[]) => {
    setPlayed(value[0]);
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video && duration) {
      video.currentTime = value[0] * duration;
    }
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = () => {
    setSeeking(false);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setPlaying(false);
    setPlayed(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='max-h-[90vh] bg-black p-0 sm:max-w-4xl'>
        <DialogTitle className='sr-only'>视频播放器</DialogTitle>
        <div className='relative h-full w-full'>
          {/* 视频播放器 */}
          <div className='relative aspect-video w-full bg-black'>
            {error ? (
              <div className='flex h-full items-center justify-center text-white'>
                <div className='text-center'>
                  <p className='mb-2 text-lg font-semibold'>视频加载失败</p>
                  <p className='text-sm text-gray-300'>{error}</p>
                  <p className='mt-2 text-xs text-gray-400'>URL: {url}</p>
                </div>
              </div>
            ) : url.includes('.m3u8') ? (
              // 对于m3u8格式，使用ReactPlayer
              <ReactPlayer
                ref={playerRef}
                url={url}
                playing={playing}
                volume={muted ? 0 : volume}
                onProgress={handleProgress}
                onDuration={handleDuration}
                onError={(e) => {
                  console.error('ReactPlayer error:', e);
                  setError('视频加载失败');
                }}
                onReady={() => {
                  console.log('ReactPlayer ready to play');
                  setError(null);
                }}
                width='100%'
                height='100%'
                style={{ objectFit: 'contain' }}
                {...({} as any)}
              />
            ) : (
              // 对于其他格式，使用原生video元素
              <video
                src={url}
                autoPlay={playing}
                muted={muted}
                className='h-full w-full object-contain'
                onError={(e) => {
                  console.error('Native video error:', e);
                  setError('视频加载失败');
                }}
                onLoadStart={() => {
                  console.log('Native video load started');
                }}
                onCanPlay={() => {
                  console.log('Native video can play');
                  setError(null);
                }}
                onPlay={() => {
                  console.log('Native video playing');
                }}
                onTimeUpdate={(e) => {
                  const video = e.target as HTMLVideoElement;
                  if (video.duration && !isNaN(video.duration)) {
                    setPlayed(video.currentTime / video.duration);
                    setDuration(video.duration);
                  }
                }}
                onVolumeChange={(e) => {
                  const video = e.target as HTMLVideoElement;
                  setVolume(video.volume);
                  setMuted(video.muted);
                }}
                crossOrigin='anonymous'
              />
            )}
          </div>

          {/* 控制栏 */}
          <div className='absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4'>
            <div className='flex items-center gap-4'>
              {/* 播放/暂停按钮 */}
              <Button
                variant='ghost'
                size='sm'
                onClick={handlePlayPause}
                className='text-white hover:bg-white/20'
              >
                {playing ? (
                  <Pause className='h-4 w-4' />
                ) : (
                  <Play className='h-4 w-4' />
                )}
              </Button>

              {/* 进度条 */}
              <div className='flex flex-1 items-center gap-2'>
                <span className='min-w-[40px] text-xs text-white'>
                  {formatTime(played * duration)}
                </span>
                <Slider
                  value={[played]}
                  onValueChange={handleSeek}
                  onValueCommit={handleSeekMouseUp}
                  onPointerDown={handleSeekMouseDown}
                  max={1}
                  step={0.001}
                  className='flex-1'
                />
                <span className='min-w-[40px] text-xs text-white'>
                  {formatTime(duration)}
                </span>
              </div>

              {/* 音量控制 */}
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleMuteToggle}
                  className='text-white hover:bg-white/20'
                >
                  {muted ? (
                    <VolumeX className='h-4 w-4' />
                  ) : (
                    <Volume2 className='h-4 w-4' />
                  )}
                </Button>
                <Slider
                  value={[muted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className='w-20'
                />
              </div>
            </div>
          </div>

          {/* 关闭按钮 */}
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='absolute top-4 right-4 text-white hover:bg-white/20'
          >
            <X className='h-4 w-4' />
          </Button>

          {/* 标题 */}
          {title && (
            <div className='absolute top-4 left-4'>
              <h3 className='text-lg font-semibold text-white'>{title}</h3>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
