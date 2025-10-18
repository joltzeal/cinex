'use client';

import { createPortal } from "react-dom";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import { useState, useEffect, useCallback } from "react";

interface LightboxSlide {
  src: string;
  alt?: string;
}

// 简单的全局状态
let globalState = {
  isOpen: false,
  slides: [] as LightboxSlide[],
  index: 0,
  updateState: () => {},
};

// 简化的控制函数 - 只需要 slides 和 index
export function openGlobalLightbox(slides: LightboxSlide[], initialIndex = 0) {
  globalState = {
    isOpen: true,
    slides,
    index: initialIndex,
    updateState: globalState.updateState,
  };
  globalState.updateState();
}

// 关闭函数
export function closeGlobalLightbox() {
  globalState.isOpen = false;
  globalState.updateState();
}

// Hook 方式使用
export function useGlobalLightbox() {
  return {
    openLightbox: openGlobalLightbox,
    closeLightbox: closeGlobalLightbox,
  };
}

// 简单的 Lightbox 组件
function GlobalLightbox() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    globalState.updateState = () => setState({ ...globalState });
  }, []);

  const handleClose = useCallback(() => {
    closeGlobalLightbox();
  }, []);

  if (!state.isOpen) return null;

  return (
    <Lightbox
      open={state.isOpen}
      close={handleClose}
      slides={state.slides}
      index={state.index}
      plugins={[Counter]}
    />
  );
}

export function GlobalLightboxProvider() {
  return typeof window !== 'undefined' ? createPortal(<GlobalLightbox />, document.body) : null;
}
