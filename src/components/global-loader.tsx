// components/global-loader.tsx
"use client";

import { useLoading } from "@/app/context/loading-context";
import { LoaderFive } from "@/components/ui/loader"; // 确保路径正确

export function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoaderFive text={loadingMessage} />
    </div>
  );
}