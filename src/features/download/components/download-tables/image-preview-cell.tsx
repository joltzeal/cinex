// // components/FullScreenImagePreview.tsx

// "use-client";

// import { useState } from "react";
// import Image from "next/image";
// import Lightbox from "yet-another-react-lightbox";
// import "yet-another-react-lightbox/styles.css";
// import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
// import Zoom from "yet-another-react-lightbox/plugins/zoom";
// import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // 导入缩略图插件
// import "yet-another-react-lightbox/plugins/thumbnails.css";

// // 1. 更新 Props，接收一个图片 URL 数组
// interface FullScreenImagePreviewProps {
//   images: string[]; // 不再是 src?: string
//   alt: string;
// }

// export function FullScreenImagePreview({ images, alt }: FullScreenImagePreviewProps) {
//   const [open, setOpen] = useState(false);
//   const [index, setIndex] = useState(0); // 状态来追踪当前点击的图片索引

//   // 2. 如果没有图片，显示占位符
//   if (!images || images.length === 0) {
//     return (
//       <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
//         无图
//       </div>
//     );
//   }
  
//   // 3. 将图片 URL 数组转换为 Lightbox 需要的 slides 格式
//   const slides = images.map((src) => ({ src }));

//   // 4. 显示一个缩略图，并在右上角显示图片数量
//   const firstImage = images[0];

//   return (
//     <>
//       <div
//         className="relative w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity group"
//         onClick={() => setOpen(true)}
//       >
//         <Image src={firstImage} alt={alt} fill className="rounded-md object-cover" />
//         {images.length > 1 && (
//           <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
//             {images.length}
//           </div>
//         )}
//       </div>

//       <Lightbox
//         open={open}
//         close={() => setOpen(false)}
//         slides={slides} // 5. 传递所有图片
//         plugins={[Fullscreen, Zoom, Thumbnails]} // 6. 启用缩略图插件
//         // 7. 移除不必要的按钮（如果需要的话，现在可以保留它们用于导航）
//         // render={{
//         //   buttonPrev: () => null,
//         //   buttonNext: () => null,
//         // }}
//       />
//     </>
//   );
// }