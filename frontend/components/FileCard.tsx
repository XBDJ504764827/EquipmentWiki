import Link from "next/link";
import { Archive, FileText, Package, PenTool, Image as ImageIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { documentDownloadUrl, type Document } from "@/lib/api";

interface FileCardProps {
  document: Document;
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 按分类/类型选择图标 */
function FileIcon({ document }: { document: Document }) {
  const cls = "size-6";
  if (document.category === "cad") return <PenTool className={cls} />;
  if (document.category === "software") return <Package className={cls} />;
  if (document.category === "archive") return <Archive className={cls} />;
  if (document.preview_type === "image") return <ImageIcon className={cls} />;
  return <FileText className={cls} />;
}

/**
 * 文件卡片：图标 + 标题 + 类型/大小/下载次数 + 下载按钮。
 * 用于 CAD 图纸、软件程序、压缩包等不可预览文件的网格展示。
 */
export function FileCard({ document }: FileCardProps) {
  const ext = (document.file_extension || document.file_type).toUpperCase();

  return (
    <div className="flex flex-col rounded-md border p-4 transition-colors hover:border-primary/50">
      <div className="flex items-start justify-between gap-2">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <FileIcon document={document} />
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {ext}
        </span>
      </div>

      <Link
        href={`/document/${document.id}`}
        className="mt-3 line-clamp-2 font-medium hover:text-primary"
      >
        {document.title}
      </Link>

      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
        {document.description || "—"}
      </p>

      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
        <span>{formatSize(document.file_size)}</span>
        <span>{document.download_count > 0 ? `${document.download_count} 次下载` : ""}</span>
      </div>

      <a
        href={documentDownloadUrl(document.id)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 w-full")}
      >
        下载
      </a>
    </div>
  );
}
