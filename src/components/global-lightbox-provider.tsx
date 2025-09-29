'use client';

import { createPortal } from "react-dom";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import { useState, useEffect } from "react";

// 简单的全局状态
let globalState = {
  isOpen: false,
  slides: [] as any[],
  index: 0,
  onClose: () => {},
  onIndexChange: (index: number) => {},
  updateState: () => {},
};

// 简单的控制函数
export function openGlobalLightbox(slides: any[], initialIndex: number, onClose: () => void, onIndexChange: (index: number) => void) {
  globalState = {
    isOpen: true,
    slides,
    index: initialIndex,
    onClose: () => {
      globalState.isOpen = false;
      globalState.updateState();
      onClose();
    },
    onIndexChange,
    updateState: globalState.updateState,
  };
  globalState.updateState();
}

// 简单的 Lightbox 组件
function GlobalLightbox() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    globalState.updateState = () => setState({ ...globalState });
  }, []);

  if (!state.isOpen) return null;

  return (
    <Lightbox
      open={state.isOpen}
      close={state.onClose}
      slides={state.slides}
      index={state.index}
      plugins={[Counter]}
    />
  );
}

export function GlobalLightboxProvider() {
  return typeof window !== 'undefined' ? createPortal(<GlobalLightbox />, document.body) : null;
}
