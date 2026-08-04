import Link from "next/link";

import { SearchHighlight } from "@/components/SearchHighlight";
import { Badge } from "@/components/ui/badge";

interface SearchResultCardProps {
  /** 卡片标题 */
  title: string;
  /** 跳转地址 */
  href: string;
  /** 匹配片段（高亮） */
  snippet?: string | null;
  /** 类型徽章文字 */
  badge?: string;
  /** 次要信息（如设备名） */
  meta?: string | null;
}

/**
 * 通用搜索结果卡片：
 * 标题（链接）→ 高亮片段 → 类型徽章 + 次要信息。
 * 用于设备/文档/故障/文章四类搜索结果的统一展示。
 */
export function SearchResultCard({
  title,
  href,
  snippet,
  badge,
  meta,
}: SearchResultCardProps) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href}
          className="min-w-0 truncate font-medium hover:text-primary"
        >
          {title}
        </Link>
        {badge && (
          <Badge variant="outline" className="shrink-0">
            {badge}
          </Badge>
        )}
      </div>

      <SearchHighlight
        snippet={snippet}
        fallback=""
        className="mt-1 block line-clamp-2 text-sm text-muted-foreground [&_strong]:text-primary [&_strong]:font-semibold"
      />

      {meta && (
        <Link
          href={href}
          className="mt-1 inline-block text-xs text-primary/80 hover:underline"
        >
          {meta}
        </Link>
      )}
    </div>
  );
}
