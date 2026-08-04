import type { Metadata } from "next";

import { SearchBox } from "@/components/SearchBox";
import { SearchFilter } from "@/components/SearchFilter";
import { SearchHistory } from "@/components/SearchHistory";
import { SearchResultView } from "@/components/SearchResult";
import { ApiError, fetchSearch, fetchTags } from "@/lib/api";

export const metadata: Metadata = {
  title: "搜索 - EquipmentWiki",
  description: "搜索设备型号、故障、说明书、维修文章",
};

interface SearchPageProps {
  searchParams: Promise<{
    keyword?: string;
    category?: string;
    manufacturer?: string;
    tag?: string;
    type?: string;
  }>;
}

/**
 * 搜索页（服务端组件）：
 * 搜索框 → 搜索历史（本地）→ 筛选面板（分类/厂家/标签）→ 分类结果。
 * 筛选通过 URL query 驱动，变更即重新取数。
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const keyword = params.keyword ?? "";
  const category = params.category ?? "";
  const manufacturer = params.manufacturer ?? "";
  const tag = params.tag ?? "";

  let result = null;
  let error: string | null = null;

  if (keyword.trim()) {
    try {
      result = await fetchSearch({ keyword, category, manufacturer, tag, type: params.type });
    } catch (err) {
      error = err instanceof ApiError ? err.message : "搜索失败，请稍后重试";
    }
  }

  // 筛选选项：分类/厂家从结果设备提取；标签用全量标签列表
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
  const allTags = (await fetchTags().catch(() => []))
    .map((t) => t.name)
    .filter((v): v is string => !!v);
  const tags = Array.from(new Set([...allTags, ...(tag ? [tag] : [])]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 搜索框 */}
      <div className="mb-4 flex flex-col items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">设备知识搜索</h1>
        <SearchBox initialKeyword={keyword} large />
        <SearchHistory />
      </div>

      {/* 筛选面板 */}
      {keyword.trim() && !error && (
        <div className="mb-6">
          <SearchFilter
            keyword={keyword}
            categories={categories}
            manufacturers={manufacturers}
            tags={tags}
            initialCategory={category}
            initialManufacturer={manufacturer}
            initialTag={tag}
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
          输入关键词搜索设备、资料、故障与维修文章
        </div>
      )}
    </main>
  );
}
