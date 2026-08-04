import { CollapsibleSection } from "@/components/CollapsibleSection";
import { EquipmentCard } from "@/components/EquipmentCard";
import { SearchResultCard } from "@/components/SearchResultCard";
import { ARTICLE_TYPE_LABELS, CATEGORY_LABELS, type SearchResult } from "@/lib/api";

interface SearchResultProps {
  result: SearchResult;
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
 * 搜索结果：按 设备 → 文档 → 故障 → 文章 分类展示（相关度排序）。
 * 设备用卡片网格；其余用 SearchResultCard（标题链接 + 高亮片段 + 类型徽章）。
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
      <CollapsibleSection title="设备" count={equipment.length} id="res-equipment">
        {equipment.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((eq) => (
              <EquipmentCard key={eq.equipment.id} equipment={eq} />
            ))}
          </div>
        ) : (
          <EmptyHint text="未找到匹配设备" />
        )}
      </CollapsibleSection>

      {/* ---- 文档结果 ---- */}
      <CollapsibleSection title="文档" count={documents.length} id="res-documents">
        {documents.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {documents.map(({ document, equipment_name, snippet }) => (
              <li key={document.id}>
                <SearchResultCard
                  title={document.title}
                  href={`/document/${document.id}`}
                  snippet={snippet}
                  badge={CATEGORY_LABELS[document.category] ?? document.category}
                  meta={
                    equipment_name
                      ? `设备：${equipment_name} · ${document.file_type.toUpperCase()}`
                      : document.file_type.toUpperCase()
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配资料" />
        )}
      </CollapsibleSection>

      {/* ---- 故障结果 ---- */}
      <CollapsibleSection title="故障" count={faults.length} id="res-faults">
        {faults.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {faults.map(({ fault, equipment_name, snippet }) => (
              <li key={fault.id}>
                <SearchResultCard
                  title={fault.title}
                  href={`/equipment/${fault.equipment_id}`}
                  snippet={snippet}
                  badge="故障"
                  meta={equipment_name ? `设备：${equipment_name}` : null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配故障" />
        )}
      </CollapsibleSection>

      {/* ---- 文章结果 ---- */}
      <CollapsibleSection title="文章" count={articles.length} id="res-articles">
        {articles.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {articles.map(({ article, equipment_name, snippet }) => (
              <li key={article.id}>
                <SearchResultCard
                  title={article.title}
                  href={`/articles/${article.slug}`}
                  snippet={snippet}
                  badge={ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
                  meta={equipment_name ? `设备：${equipment_name}` : null}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="未找到匹配文章" />
        )}
      </CollapsibleSection>
    </div>
  );
}
