import type { Metadata } from "next";

import { FilterPanel } from "@/components/FilterPanel";
import { SearchBox } from "@/components/SearchBox";
import { SearchResultView } from "@/components/SearchResult";
import { ApiError, fetchSearch } from "@/lib/api";

export const metadata: Metadata = {
  title: "搜索 - EquipmentWiki",
  description: "搜索设备型号、故障、说明书",
};

interface SearchPageProps {
  searchParams: Promise<{
    keyword?: string;
    category?: string;
    manufacturer?: string;
    type?: string;
  }>;
}

/**
 * 搜索页（服务端组件）：
 * 页面结构：搜索框 → 筛选面板 → 搜索结果（设备/文档/故障分类展示）。
 * 筛选通过 URL query 驱动，变更即重新取数。
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const keyword = params.keyword ?? "";
  const category = params.category ?? "";
  const manufacturer = params.manufacturer ?? "";

  let result = null;
  let error: string | null = null;

  if (keyword.trim()) {
    try {
      result = await fetchSearch({ keyword, category, manufacturer, type: params.type });
    } catch (err) {
      error = err instanceof ApiError ? err.message : "搜索失败，请稍后重试";
    }
  }

  // 筛选选项：从当前设备结果中提取分类/厂家（并保留已选值）
  const categories = Array.from(
    new Set([
      ...(result?.equipment.map((e) => e.category_name).filter((v): v is string => !!v) ?? []),
      ...(category ? [category] : []),
    ]),
  );
  const manufacturers = Array.from(
    new Set([
      ...(result?.equipment.map((e) => e.equipment.manufacturer).filter((v): v is string => !!v) ?? []),
      ...(manufacturer ? [manufacturer] : []),
    ]),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 搜索框 */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <h1 className="mb-3 text-2xl font-bold tracking-tight">设备知识搜索</h1>
        <SearchBox initialKeyword={keyword} large />
      </div>

      {/* 筛选面板 */}
      {keyword.trim() && !error && (
        <div className="mb-6">
          <FilterPanel
            keyword={keyword}
            categories={categories}
            manufacturers={manufacturers}
            initialCategory={category}
            initialManufacturer={manufacturer}
          />
        </div>
      )}

      {/* 结果 */}
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-16 text-center text-destructive">
          {error}
        </div>
      ) : keyword.trim() && result ? (
        <SearchResultView result={result} />
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          输入关键词搜索设备、资料与故障解决方案
        </div>
      )}
    </main>
  );
}
