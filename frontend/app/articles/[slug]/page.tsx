import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ARTICLE_TYPE_LABELS,
  fetchArticleDetail,
  fetchEquipmentArticles,
} from "@/lib/api";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/** SEO：标题 + 描述（搜索引擎可收录） */
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { article } = await fetchArticleDetail(slug);
    return {
      title: `${article.title} - EquipmentWiki`,
      description: article.summary || article.content.slice(0, 120),
    };
  } catch {
    return { title: "文章 - EquipmentWiki" };
  }
}

/**
 * 文章详情页（URL 为 slug，如 /articles/fx5u-communication-error）：
 * 标题 → 类型/更新时间/设备信息 → Markdown 正文 → 相关文章。
 */
export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  const data = await fetchArticleDetail(slug).catch(() => null);
  if (!data) notFound();
  const { article, equipment_name } = data;

  // 相关文章：同设备其他文章
  const related = article.equipment_id
    ? (await fetchEquipmentArticles(article.equipment_id).catch(() => [])).filter(
        (a) => a.article.id !== article.id,
      )
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/articles"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        ← 返回文章列表
      </Link>

      {/* 文章头部 */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}</Badge>
          <span className="text-sm text-muted-foreground">
            更新于 {new Date(article.updated_at).toLocaleDateString("zh-CN")}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{article.title}</h1>

        {/* 关联设备信息 */}
        {equipment_name && article.equipment_id && (
          <p className="mt-3 text-sm text-muted-foreground">
            关联设备：
            <Link
              href={`/equipment/${article.equipment_id}`}
              className="text-primary hover:underline"
            >
              {equipment_name}
            </Link>
          </p>
        )}
        {article.summary && (
          <p className="mt-3 text-muted-foreground">{article.summary}</p>
        )}
      </header>

      {/* Markdown 正文 */}
      <article className="rounded-lg border p-6 sm:p-8">
        <MarkdownRenderer content={article.content} />
      </article>

      {/* 相关文章 */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
            相关文章
          </h2>
          <ul className="divide-y rounded-md border">
            {related.map(({ article: a }) => (
              <li key={a.id} className="px-4 py-3">
                <Link href={`/articles/${a.slug}`} className="font-medium hover:text-primary">
                  {a.title}
                </Link>
                <Badge variant="outline" className="ml-2">
                  {ARTICLE_TYPE_LABELS[a.article_type] ?? a.article_type}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
