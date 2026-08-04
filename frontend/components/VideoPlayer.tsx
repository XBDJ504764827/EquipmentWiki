import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { documentDownloadUrl, type Document } from "@/lib/api";

const VIDEO_TYPES = new Set(["mp4", "webm"]);

interface VideoPlayerProps {
  document: Document;
}

/**
 * 视频说明书播放器：
 * - HTML5 `<video>` 原生播放（H.264 mp4 / webm，稳定无需第三方组件）
 * - 预加载元数据（不预下载整段视频，节省流量）
 * - 提供下载按钮（走 /download 接口）
 */
export function VideoPlayer({ document }: VideoPlayerProps) {
  const isVideo = VIDEO_TYPES.has(document.file_type);

  if (!isVideo) return null;

  return (
    <div className="space-y-2">
      <video
        src={document.file_url}
        controls
        preload="metadata"
        className="w-full rounded-md border bg-black"
        poster={undefined}
      >
        您的浏览器不支持视频播放，请
        <a href={documentDownloadUrl(document.id)}>下载视频</a>
        后本地观看。
      </video>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {document.description || "视频说明书"}
          {document.download_count > 0 && ` · 已下载 ${document.download_count} 次`}
        </span>
        <a
          href={documentDownloadUrl(document.id)}
          className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
        >
          下载视频
        </a>
      </div>
    </div>
  );
}
