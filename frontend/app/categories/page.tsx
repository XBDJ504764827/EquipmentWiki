import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ApiError, fetchCategories, type CategoryNode } from "@/lib/api";

export const metadata: Metadata = {
  title: "设备分类 - EquipmentWiki",
  description: "按分类浏览设备资料",
};

/** 递归渲染分类树（可展开的多级导航） */
function CategoryTree({ nodes, depth = 0 }: { nodes: CategoryNode[]; depth?: number }) {
  return (
    <ul className={depth > 0 ? "ml-4 border-l pl-3" : ""}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/categories/${node.id}`}
            className="group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted hover:text-primary"
          >
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
            <span className="font-medium">{node.name}</span>
            {node.children.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({node.children.length})
              </span>
            )}
          </Link>
          {node.children.length > 0 && <CategoryTree nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

/** 分类导航页：设备分类树（工业设备 → PLC → 三菱PLC） */
export default async function CategoriesPage() {
  let categories: CategoryNode[] | null = null;
  let error: string | null = null;

  try {
    categories = await fetchCategories();
  } catch (err) {
    error = err instanceof ApiError ? err.message : "分类加载失败";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">设备分类</h1>
      <p className="mb-6 text-muted-foreground">按设备分类浏览设备资料</p>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-16 text-center text-destructive">
          {error}
        </div>
      ) : (
        <Card>
          <CardContent className="py-4">
            <CategoryTree nodes={categories ?? []} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
