import Link from "next/link";
import { ChevronRight, Wrench } from "lucide-react";

import { SearchBox } from "@/components/SearchBox";
import { Card, CardContent } from "@/components/ui/card";
import {
  ARTICLE_TYPE_LABELS,
  fetchArticles,
  fetchCategories,
  fetchDocuments,
  fetchEquipmentList,
  type CategoryNode,
} from "@/lib/api";

/** 移动端首页单行展示的前几个分类 */
const HOME_CATEGORY_COUNT = 6;

/** 扁平化分类树 → 一级分类 */
function rootCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.slice(0, HOME_CATEGORY_COUNT);
}

/** 区块标题 */
function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="border-l-4 border-primary pl-2.5 text-base font-semibold">{children}</h2>
      {href && (
        <Link href={href} className="flex items-center text-xs text-muted-foreground hover:text-primary">
          更多 <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/**
 * 首页（移动优先）：
 * 顶部搜索框 → 设备分类入口 → 热门设备 → 最新资料 → 热门维修文章。
 */
export default async function Home() {
  const [categories, equipmentData, articlesData] = await Promise.all([
    fetchCategories().catch(() => [] as CategoryNode[]),
    fetchEquipmentList(1, 4).catch(() => null),
    fetchArticles({ page: 1, limit: 4 }).catch(() => null),
  ]);

  const equipment = equipmentData?.items ?? [];
  const articles = articlesData?.items ?? [];
  const cats = rootCategories(categories);

  // 最新资料：取前 3 台设备的文档聚合（最多 6 条）
  const latestDocs: { id: number; title: string; equipment_id: number; file_type: string }[] = [];
  for (const eq of equipment.slice(0, 3)) {
    const docs = await fetchDocuments(eq.equipment.id).catch(() => []);
    for (const d of docs) {
      latestDocs.push({ id: d.id, title: d.title, equipment_id: d.equipment_id, file_type: d.file_type });
    }
    if (latestDocs.length >= 6) break;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      {/* ---- 顶部：品牌 + 搜索框 ---- */}
      <header className="mb-5 flex items-center gap-2">
        <Wrench className="size-6 text-primary" />
        <span className="text-lg font-bold">EquipmentWiki</span>
      </header>
      <div className="mb-6">
        <SearchBox large />
      </div>

      {/* ---- 分类入口 ---- */}
      {cats.length > 0 && (
        <section className="mb-6">
          <SectionTitle>设备分类</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {cats.map((cat) => (
              <Link
                key={cat.id}
                href={`/equipment?category_id=${cat.id}`}
                className="flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs transition-colors hover:border-primary hover:text-primary"
              >
                <span className="line-clamp-1 font-medium">{cat.name}</span>
                <span className="text-muted-foreground">{cat.children.length > 0 ? `${cat.children.length} 子类` : "查看"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- 热门设备 ---- */}
      <section className="mb-6">
        <SectionTitle href="/equipment">设备</SectionTitle>
        {equipment.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            暂无设备
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {equipment.map(({ equipment: eq, category_name }) => (
              <Link key={eq.id} href={`/equipment/${eq.id}`}>
                <Card className="transition-colors hover:border-primary/60">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{eq.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {eq.model} · {category_name ?? "未分类"}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---- 最新资料 ---- */}
      {latestDocs.length > 0 && (
        <section className="mb-6">
          <SectionTitle>最新资料</SectionTitle>
          <div className="rounded-lg border">
            {latestDocs.slice(0, 5).map((doc) => (
              <Link
                key={doc.id}
                href={`/document/${doc.id}`}
                className="flex items-center justify-between gap-3 border-b px-3.5 py-3 last:border-b-0 hover:bg-muted/40"
              >
                <span className="min-w-0 truncate text-sm">{doc.title}</span>
                <span className="shrink-0 text-xs uppercase text-muted-foreground">{doc.file_type}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- 热门维修文章 ---- */}
      <section className="mb-6">
        <SectionTitle href="/articles">维修文章</SectionTitle>
        {articles.length === 0 ? (
          <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            暂无文章
          </p>
        ) : (
          <div className="rounded-lg border">
            {articles.map(({ article }) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="flex items-center justify-between gap-3 border-b px-3.5 py-3 last:border-b-0 hover:bg-muted/40"
              >
                <span className="min-w-0 truncate text-sm">{article.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
