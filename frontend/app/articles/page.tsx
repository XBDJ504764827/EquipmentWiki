import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ARTICLE_TYPE_LABELS,
  ApiError,
  fetchArticles,
  type ArticleType,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "维修知识文章 - EquipmentWiki",
  description: "维修教程、操作指南、维护教程与维修经验",
};

interface ArticlesPageProps {
  searchParams: Promise<{ page?: string; type?: string }>;
}

/** 文章列表页：标题/摘要/类型徽章/关联设备，支持分页与类型筛选 */
export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { page: pageParam, type } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let data;
  let error: string | null = null;
  try {
    data = await fetchArticles({ page, limit: 12, type });
  } catch (err) {
    error = err instanceof ApiError ? err.message : "文章加载失败";
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">维修知识文章</h1>
      <p className="mb-6 text-muted-foreground">维修教程 · 操作指南 · 维护教程 · 维修经验</p>

      {/* 类型筛选 */}
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/articles"
          className={cn(
            "rounded-full border px-3 py-1 transition-colors",
            !type ? "border-primary text-primary" : "hover:border-primary/60",
          )}
        >
          全部
        </Link>
        {(Object.keys(ARTICLE_TYPE_LABELS) as ArticleType[]).map((t) => (
          <Link
            key={t}
            href={`/articles?type=${t}`}
            className={cn(
              "rounded-full border px-3 py-1 transition-colors",
              type === t ? "border-primary text-primary" : "hover:border-primary/60",
            )}
          >
            {ARTICLE_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-16 text-center text-destructive">
          {error}
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            共 {data?.total ?? 0} 篇文章 · 第 {page} / {totalPages} 页
          </p>

          {data && data.items.length === 0 ? (
            <p className="rounded-md border border-dashed py-16 text-center text-muted-foreground">
              暂无文章
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data?.items.map(({ article, equipment_name }) => (
                <li key={article.id} className="px-4 py-4">
                  <Link href={`/articles/${article.slug}`} className="block hover:text-primary">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{article.title}</h2>
                      <Badge>{ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}</Badge>
                    </div>
                    {article.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {article.summary}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      关联设备：
                      {equipment_name ? (
                        <Link href={`/equipment/${article.equipment_id}`} className="text-primary hover:underline">
                          {equipment_name}
                        </Link>
                      ) : (
                        "通用"
                      )}
                      {" · "}
                      {new Date(article.updated_at).toLocaleDateString("zh-CN")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Link
                href={page > 1 ? `/articles?page=${page - 1}${type ? `&type=${type}` : ""}` : "#"}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page <= 1 && "pointer-events-none opacity-50",
                )}
              >
                上一页
              </Link>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Link
                href={page < totalPages ? `/articles?page=${page + 1}${type ? `&type=${type}` : ""}` : "#"}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page >= totalPages && "pointer-events-none opacity-50",
                )}
              >
                下一页
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
