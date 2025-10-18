// 'use client';

// import { Button } from "@/components/ui/button";
// import { Spinner } from "@/components/ui/spinner";
// import { extractMagnetLinks } from "@/lib/magnet-helper";
// import { Download } from "lucide-react";
// import { useState } from "react";
// import { toast } from "sonner";

// export function PostDownload({ content,title }: { content: string,title: string }) {
//   const [isLoading, setIsLoading] = useState(false);
//   const handleDownload = async () => {
//     setIsLoading(true);
//     try {
//       const magnetLinks = extractMagnetLinks(content);
//       console.log(magnetLinks);
//       if (magnetLinks.length === 0) {
//         toast.error("没有磁力链接");
//         return;
//       }
//       const form = new FormData();
//       form.append('title',title)
//       form.append("downloadURLs", JSON.stringify(magnetLinks));
//       const response = await fetch(`/api/download`, {
//         method: "POST",
//         body: form,
//       });
//       if (response.ok) {
//         toast.success("下载任务已提交");
//       } else {
//         toast.error("下载失败");
//       }
//     }
//       catch (error) {
//       toast.error("下载失败");
//     } finally {
//       setIsLoading(false);
//     }
//   }
//   return (
//     <Button size="sm" onClick={handleDownload} disabled={isLoading} className="ml-1">
//       {isLoading ? (
//         <Spinner />
//       ) : (
//         <Download className="h-4 w-4 " />
//       )}
//     </Button>
//   );
// }