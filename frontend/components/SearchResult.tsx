import Link from "next/link";

import { EquipmentCard } from "@/components/EquipmentCard";
import { Badge } from "@/components/ui/badge";
import { ARTICLE_TYPE_LABELS, type SearchResult } from "@/lib/api";

interface SearchResultProps {
  result: SearchResult;
}

/** 区块标题：分类名 + 命中数量 */
function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
      {title}
      <span className="ml-2 text-sm font-normal text-muted-foreground">
        {count} 条
      </span>
    </h2>
  );
}

/** 空区块占位 */
function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

/**
 * 搜索结果：按 设备 → 文档 → 故障 三个区块分类展示。
 * 设备用卡片网格；文档/故障用紧凑列表（含所属设备名，可跳转详情页）。
 */
export function SearchResultView({ result }: SearchResultProps) {
  const { equipment, documents, faults, articles } = result;
  const hasAny =
    equipment.length > 0 ||
    documents.length > 0 ||
    faults.length > 0 ||
    articles.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-lg border py-16 text-center text-muted-foreground">
        未找到匹配结果，请尝试其他关键词
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---- 设备结果 ---- */}
      <section>
        <SectionHeading title="设备" count={equipment.length} />
        {equipment.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((eq) => (
              <EquipmentCard key={eq.equipment.id} equipment={eq} />
            ))}
          </div>
        ) : (
          <EmptyHint text="未找到匹配设备" />
        )}
      </section>

      {/* ---- 文档结果 ---- */}
      <section>
        <SectionHeading title="资料" count={documents.length} />
        {documents.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {documents.map(({ document, equipment_name }) => (
              <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{document.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {document.description || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/equipment/${document.equipment_id}`}
                    className="max-w-40 truncate text-sm text-primary hover:underline"
                  >
                    {equipment_name}
                  </Link>
                  <Badge variant="secondary" className="uppercase">
                    {document.file_type}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配资料" />
        )}
      </section>

      {/* ---- 故障结果 ---- */}
      <section>
        <SectionHeading title="故障" count={faults.length} />
        {faults.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {faults.map(({ fault, equipment_name }) => (
              <li key={fault.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{fault.title}</p>
                  <Link
                    href={`/equipment/${fault.equipment_id}`}
                    className="max-w-40 truncate text-sm text-primary hover:underline"
                  >
                    {equipment_name}
                  </Link>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {fault.symptom || fault.solution}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配故障" />
        )}
      </section>

      {/* ---- 文章结果 ---- */}
      <section>
        <SectionHeading title="文章" count={articles.length} />
        {articles.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {articles.map(({ article, equipment_name: eqName }) => (
              <li key={article.id} className="px-4 py-3">
                <Link
                  href={`/articles/${article.slug}`}
                  className="flex items-center justify-between gap-3 hover:text-primary"
                >
                  <p className="min-w-0 truncate font-medium">{article.title}</p>
                  <Badge variant="outline" className="shrink-0">
                    {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
                  </Badge>
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {article.summary || article.content}
                </p>
                {eqName && article.equipment_id && (
                  <Link
                    href={`/equipment/${article.equipment_id}`}
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    设备：{eqName}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配文章" />
        )}
      </section>
    </div>
  );
}
