"use client";
import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
export default function StorageProgress({ value, className }: { value: number, className: string }) {
  const [progress, setProgress] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Progress
      value={progress}
      className={cn(" [&>div]:bg-linear-to-r [&>div]:from-cyan-400 [&>div]:via-sky-500 [&>div]:to-indigo-500 [&>div]:rounded-l-full", className)}
    />
  );
}
