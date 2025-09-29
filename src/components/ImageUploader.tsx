"use client";

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileImage } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value = [], onChange }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // 创建预览URL
    const newPreviews = value.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // 清理函数，防止内存泄漏
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [value]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onChange([...value, ...acceptedFiles]);
    setIsDragging(false);
  }, [value, onChange]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    // 检查是否有输入框聚焦
    const activeElement = window.document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    );

    // 如果有输入框聚焦，不处理图片粘贴逻辑，让默认行为处理
    if (isInputFocused) {
      return;
    }

    const items = event.clipboardData?.items;
    if (items) {
      const filesToPaste: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            filesToPaste.push(file);
          }
        }
      }
      if (filesToPaste.length > 0) {
        event.preventDefault(); // 阻止默认行为
        onChange([...value, ...filesToPaste]);
      }
    }
  }, [value, onChange]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);


  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`w-full p-6 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors
        ${isDragging || isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
          <UploadCloud className="w-10 h-10" />
          <p className="font-semibold">拖拽图片到这里, 或点击选择文件</p>
          <p className="text-sm">也可以直接粘贴截图</p>
        </div>
      </div>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square">
              <Image
                src={preview}
                alt={`preview ${index}`}
                fill
                className="object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};