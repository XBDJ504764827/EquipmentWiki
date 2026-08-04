import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { documentDownloadUrl, type Document } from "@/lib/api";

interface DocumentViewerProps {
  document: Document;
}

/**
 * 统一文件预览器：根据 preview_type 渲染。
 * - pdf   → 浏览器原生 PDF 查看器（iframe）
 * - image → 图片直接展示
 * - video → HTML5 视频播放
 * - none  → 下载提示（CAD/软件/压缩包等）
 */
export function DocumentViewer({ document }: DocumentViewerProps) {
  const { preview_type, file_url, title, download_count } = document;

  if (preview_type === "pdf") {
    return (
      <iframe
        src={file_url}
        title={title}
        className="h-[480px] w-full rounded-md border bg-white"
      />
    );
  }

  if (preview_type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={file_url}
        alt={title}
        className="max-h-[480px] w-auto max-w-full rounded-md border bg-white"
      />
    );
  }

  if (preview_type === "video") {
    return (
      <video
        src={file_url}
        controls
        preload="metadata"
        className="w-full rounded-md border bg-black"
      >
        您的浏览器不支持视频播放，请下载后本地观看。
      </video>
    );
  }

  // 其他类型（cad / software / archive / doc / xls ...）
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-10 text-sm text-muted-foreground">
      <span>
        {document.file_extension
          ? `${document.file_extension.toUpperCase()} 文件`
          : document.file_type.toUpperCase()}
        {download_count > 0 && ` · 已下载 ${download_count} 次`}
      </span>
      <a
        href={documentDownloadUrl(document.id)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        下载文件
      </a>
    </div>
  );
}
