// "use client";

// import { useState, useEffect, useRef } from 'react';

// interface VideoThumbnailGeneratorProps {
//   videoUrl: string;
//   onThumbnailGenerated?: (thumbnailUrl: string) => void;
//   width?: number;
//   height?: number; timeOffset?: number; }

// export default function VideoThumbnailGenerator({
//   videoUrl,
//   onThumbnailGenerated,
//   width = 320,
//   height = 240,
//   timeOffset = 1
// }: VideoThumbnailGeneratorProps) {
//   const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     if (!videoUrl) return;

//     const generateThumbnail = async () => {
//       setIsGenerating(true);
      
//       try {
//         const video = document.createElement('video');
//         const canvas = document.createElement('canvas');
//         const ctx = canvas.getContext('2d');

//         if (!ctx) {
//           throw new Error('无法创建 Canvas 上下文');
//         }

//         // 设置 Canvas 尺寸
//         canvas.width = width;
//         canvas.height = height;

//         // 设置视频属性
//         video.crossOrigin = 'anonymous';
//         video.preload = 'metadata';
//         video.muted = true;

//         return new Promise<string>((resolve, reject) => {
//           const cleanup = () => {
//             video.remove();
//             canvas.remove();
//           };

//           video.onloadeddata = () => {
//             try {
//               video.currentTime = timeOffset;
//             } catch (error) {
//               console.warn('无法跳转到指定时间:', error);
//             }
//           };

//           video.onseeked = () => {
//             try {
//               // 计算视频的宽高比
//               const videoAspectRatio = video.videoWidth / video.videoHeight;
//               const canvasAspectRatio = width / height;
              
//               let drawWidth = width;
//               let drawHeight = height;
//               let offsetX = 0;
//               let offsetY = 0;
              
//               // 如果视频比画布更宽，则按宽度缩放，否则按高度缩放
//               if (videoAspectRatio > canvasAspectRatio) {
//                 // 视频更宽，按高度缩放
//                 drawHeight = height;
//                 drawWidth = height * videoAspectRatio;
//                 offsetX = (width - drawWidth) / 2;
//               } else {
//                 // 视频更高，按宽度缩放
//                 drawWidth = width;
//                 drawHeight = width / videoAspectRatio;
//                 offsetY = (height - drawHeight) / 2;
//               }
              
//               // 绘制视频帧到 Canvas，保持宽高比
//               ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
              
//               // 转换为 Blob URL
//               canvas.toBlob((blob) => {
//                 if (blob) {
//                   const url = URL.createObjectURL(blob);
//                   resolve(url);
//                 } else {
//                   reject(new Error('无法生成预览图'));
//                 }
//                 cleanup();
//               }, 'image/jpeg', 0.8);
//             } catch (error) {
//               reject(error);
//               cleanup();
//             }
//           };

//           video.onerror = (error) => {
//             reject(new Error(`视频加载失败: ${error}`));
//             cleanup();
//           };

//           // 设置视频源
//           video.src = videoUrl;
//         });
//       } catch (error) {
//         console.error('生成视频预览图失败:', error);
//         return null;
//       } finally {
//         setIsGenerating(false);
//       }
//     };

//     generateThumbnail().then((url) => {
//       if (url) {
//         setThumbnailUrl(url);
//         onThumbnailGenerated?.(url);
//       }
//     });
//   }, [videoUrl, width, height, timeOffset, onThumbnailGenerated]);

//   // 清理资源
//   useEffect(() => {
//     return () => {
//       if (thumbnailUrl) {
//         URL.revokeObjectURL(thumbnailUrl);
//       }
//     };
//   }, [thumbnailUrl]);

//   if (isGenerating) {
//     return (
//       <div className="w-full h-full bg-gray-800 flex items-center justify-center">
//         <div className="text-white text-sm">生成预览图中...</div>
//       </div>
//     );
//   }

//   if (thumbnailUrl) {
//     return (
//       <img
//         src={thumbnailUrl}
//         alt="视频预览"
//         className="w-full h-full object-cover"
//         onError={() => {
//           console.error('预览图加载失败');
//           setThumbnailUrl(null);
//         }}
//       />
//     );
//   }

//   // 默认占位图
//   return (
//     <div className="w-full h-full bg-gray-800 flex items-center justify-center">
//       <div className="text-white text-sm">视频预览</div>
//     </div>
//   );
// }
