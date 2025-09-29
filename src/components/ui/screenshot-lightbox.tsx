"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Image from "next/image";
import React from "react";

interface Screenshot {
  time?: number;
  screenshot: string;
}

interface ScreenshotLightboxProps {
  screenshots: Screenshot[];
  children: React.ReactNode;
  className?: string;
  // 外部状态控制
  externalLightboxOpen?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
}

export function ScreenshotLightbox({ 
  screenshots, 
  children, 
  className = "",
  externalLightboxOpen,
  onLightboxOpenChange
}: ScreenshotLightboxProps) {
  const [internalLightboxOpen, setInternalLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 使用外部状态或内部状态
  const isControlled = externalLightboxOpen !== undefined;
  const lightboxOpen = isControlled ? externalLightboxOpen : internalLightboxOpen;

  const slides = screenshots.map(ss => ({ src: ss.screenshot }));

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    if (isControlled) {
      onLightboxOpenChange?.(true);
    } else {
      setInternalLightboxOpen(true);
    }
  };

  const handleLightboxClose = () => {
    if (isControlled) {
      onLightboxOpenChange?.(false);
    } else {
      setInternalLightboxOpen(false);
    }
  };

  return (
    <>
      <div className={className}>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              onClick: () => handleImageClick(index),
              key: index,
            } as any);
          }
          return child;
        })}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={handleLightboxClose}
        slides={slides}
        index={lightboxIndex}
        carousel={{
          finite: true,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
        }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined,
        }}
      />
    </>
  );
}

// 预定义的截图网格组件
interface ScreenshotGridProps {
  screenshots: Screenshot[];
  maxDisplay?: number;
  className?: string;
  // 外部状态控制
  externalLightboxOpen?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
}

export function ScreenshotGrid({ 
  screenshots, 
  maxDisplay = 4, 
  className = "",
  externalLightboxOpen,
  onLightboxOpenChange
}: ScreenshotGridProps) {
  const [internalLightboxOpen, setInternalLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 使用外部状态或内部状态
  const isControlled = externalLightboxOpen !== undefined;
  const lightboxOpen = isControlled ? externalLightboxOpen : internalLightboxOpen;

  const slides = screenshots.map(ss => ({ src: ss.screenshot }));
  const displayScreenshots = screenshots.slice(0, maxDisplay);

  const handleImageClick = (displayIndex: number) => {
    // 找到在完整screenshots数组中的实际索引
    const actualIndex = displayIndex;
    setLightboxIndex(actualIndex);
    if (isControlled) {
      onLightboxOpenChange?.(true);
    } else {
      setInternalLightboxOpen(true);
    }
  };

  const handleLightboxClose = () => {
    if (isControlled) {
      onLightboxOpenChange?.(false);
    } else {
      setInternalLightboxOpen(false);
    }
  };

  return (
    <>
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {displayScreenshots.map((ss, index) => (
          <div
            key={index}
            className="relative aspect-video overflow-hidden rounded-md cursor-pointer group"
            onClick={() => handleImageClick(index)}
          >
            <Image
              src={ss.screenshot}
              alt={`Screenshot ${index + 1}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={handleLightboxClose}
        slides={slides}
        index={lightboxIndex}
        carousel={{
          finite: true,
        }}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
        }}
        render={{
          buttonPrev: slides.length <= 1 ? () => null : undefined,
          buttonNext: slides.length <= 1 ? () => null : undefined,
        }}
      />
    </>
  );
}
