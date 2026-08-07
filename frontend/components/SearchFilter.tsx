"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface SearchFilterProps {
  /** 当前关键词 */
  keyword: string;
  /** 可选厂家列表 */
  manufacturers: string[];
  /** 可选标签列表 */
  tags: string[];
  initialManufacturer?: string;
  initialTag?: string;
}

/**
 * 搜索结果筛选面板（客户端组件）：
 * 分类 / 厂家 / 标签下拉，变更后刷新 URL（?keyword=..&category=..&tag=..），
 * 由服务端组件重新取数。
 */
export function SearchFilter({
  keyword,
  manufacturers,
  tags,
  initialManufacturer = "",
  initialTag = "",
}: SearchFilterProps) {
  const router = useRouter();

  function applyFilter(key: "manufacturer" | "tag", value: string) {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (key === "manufacturer") params.set("manufacturer", value);
    if (key === "tag") params.set("tag", value);
    // 保留其他已选筛选
    if (key !== "manufacturer" && initialManufacturer)
      params.set("manufacturer", initialManufacturer);
    if (key !== "tag" && initialTag) params.set("tag", initialTag);
    router.push(`/search?${params.toString()}`);
  }

  const selectCls = cn(
    "h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const hasFilter = initialManufacturer || initialTag;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {manufacturers.length > 0 && (
        <label className="flex items-center gap-2 text-muted-foreground">
          厂家
          <select
            className={selectCls}
            value={initialManufacturer}
            onChange={(e) => applyFilter("manufacturer", e.target.value)}
          >
            <option value="">全部</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}

      {tags.length > 0 && (
        <label className="flex items-center gap-2 text-muted-foreground">
          标签
          <select
            className={selectCls}
            value={initialTag}
            onChange={(e) => applyFilter("tag", e.target.value)}
          >
            <option value="">全部</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push(`/search?keyword=${encodeURIComponent(keyword)}`)}
          className="text-xs text-primary underline underline-offset-4 hover:text-primary/80"
        >
          清除筛选
        </button>
      )}
    </div>
  );
}
