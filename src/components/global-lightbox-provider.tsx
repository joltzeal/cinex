// 'use client';

// import { createPortal } from 'react-dom';
// import Lightbox from 'yet-another-react-lightbox';
// import 'yet-another-react-lightbox/styles.css';
// import Counter from 'yet-another-react-lightbox/plugins/counter';
// import Zoom from 'yet-another-react-lightbox/plugins/zoom';
// import { useState, useEffect, useCallback } from 'react';

// interface LightboxSlide {
//   src: string;
//   alt?: string;
// }

// // 简单的全局状态
// let globalState = {
//   isOpen: false,
//   slides: [] as LightboxSlide[],
//   index: 0,
//   isClosing: false, // 添加关闭中的标志
//   updateState: () => {}
// };

// // 导出一个函数来检查 Lightbox 是否打开（且不在关闭中）
// export function isLightboxOpen() {
//   return globalState.isOpen && !globalState.isClosing;
// }

// // 简化的控制函数 - 只需要 slides 和 index
// export function openGlobalLightbox(slides: LightboxSlide[], initialIndex = 0) {
//   globalState = {
//     isOpen: true,
//     slides,
//     index: initialIndex,
//     isClosing: false,
//     updateState: globalState.updateState
//   };
//   globalState.updateState();
// }

// // 关闭函数
// export function closeGlobalLightbox() {
//   globalState.isClosing = true; // 先标记为关闭中
//   globalState.updateState();

//   // 立即关闭 Lightbox UI
//   setTimeout(() => {
//     globalState.isOpen = false;
//     globalState.isClosing = false;
//     globalState.updateState();
//   }, 0);
// }

// // Hook 方式使用
// export function useGlobalLightbox() {
//   return {
//     openLightbox: openGlobalLightbox,
//     closeLightbox: closeGlobalLightbox
//   };
// }

// // 简单的 Lightbox 组件
// function GlobalLightbox() {
//   const [state, setState] = useState(globalState);

//   useEffect(() => {
//     globalState.updateState = () => setState({ ...globalState });
//   }, []);

//   const handleClose = useCallback(() => {
//     closeGlobalLightbox();
//   }, []);

//   if (!state.isOpen) return null;

//   return (
//     <Lightbox
//       open={state.isOpen && !state.isClosing}
//       close={handleClose}
//       slides={state.slides}
//       index={state.index}
//       plugins={[Counter, Zoom]}
//       zoom={{
//         maxZoomPixelRatio: 3,
//         scrollToZoom: true
//       }}
//     />
//   );
// }

// export function GlobalLightboxProvider() {
//   return typeof window !== 'undefined'
//     ? createPortal(<GlobalLightbox />, document.body)
//     : null;
// }
