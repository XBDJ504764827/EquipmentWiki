"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface FilterPanelProps {
  /** 当前关键词 */
  keyword: string;
  /** 可选分类列表（从当前搜索结果提取 + 当前选中值） */
  categories: string[];
  /** 可选厂家列表 */
  manufacturers: string[];
  /** 当前选中的分类/厂家 */
  initialCategory?: string;
  initialManufacturer?: string;
}

/**
 * 筛选面板（客户端组件）：
 * 分类 / 厂家下拉，变更后刷新 URL（/search?keyword=..&category=..&manufacturer=..），
 * 由服务端组件重新取数。
 */
export function FilterPanel({
  keyword,
  categories,
  manufacturers,
  initialCategory = "",
  initialManufacturer = "",
}: FilterPanelProps) {
  const router = useRouter();

  function applyFilter(key: "category" | "manufacturer", value: string) {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (key === "category" && value) params.set("category", value);
    if (key === "manufacturer" && value) params.set("manufacturer", value);
    if (key === "category" && initialManufacturer) params.set("manufacturer", initialManufacturer);
    if (key === "manufacturer" && initialCategory) params.set("category", initialCategory);
    router.push(`/search?${params.toString()}`);
  }

  const selectCls = cn(
    "h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        分类
        <select
          className={selectCls}
          value={initialCategory}
          onChange={(e) => applyFilter("category", e.target.value)}
        >
          <option value="">全部</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

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

      {(initialCategory || initialManufacturer) && (
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
