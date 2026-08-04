import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  documentDownloadUrl,
  type Document,
} from "@/lib/api";

interface DocumentListProps {
  documents: Document[];
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 设备资料列表：每行显示标题（跳转资料详情页）、分类、类型、版本、大小，
 * 右侧提供下载按钮（走 /download 接口）。
 */
export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        暂无资料
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <Link
            href={`/document/${doc.id}`}
            className="min-w-0 flex-1 hover:text-primary"
          >
            <p className="truncate font-medium">
              {doc.title}
              {doc.is_primary && (
                <span className="ml-2 text-xs text-muted-foreground">★ 主要</span>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {doc.description || "—"}
              {formatSize(doc.file_size) && ` · ${formatSize(doc.file_size)}`}
              {doc.version && doc.version !== "1.0" && ` · v${doc.version}`}
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">
              {CATEGORY_LABELS[doc.category] ?? doc.category}
            </Badge>
            <Badge variant="secondary" className="uppercase">
              {doc.file_type}
            </Badge>
            <a
              href={documentDownloadUrl(doc.id)}
              className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
            >
              下载
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
