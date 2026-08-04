import Link from "next/link";
import { notFound } from "next/navigation";

import { EquipmentCard } from "@/components/EquipmentCard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchCategories,
  fetchCategoryEquipment,
  fetchDocuments,
  type CategoryNode,
} from "@/lib/api";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

/** 在分类树中查找指定分类 */
function findCategory(nodes: CategoryNode[], id: number): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findCategory(node.children, id);
    if (found) return found;
  }
  return null;
}

/** 收集分类路径（根 → 叶） */
function findPath(nodes: CategoryNode[], id: number): CategoryNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = findPath(node.children, id);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

/**
 * 分类详情页（SEO 独立 URL）：
 * 分类介绍（路径 + 名称 + 描述）→ 设备列表 → 相关资料（该分类设备的文档）。
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const categoryId = Number(id);

  async function fetchDocumentsForCategory(cid: string) {
    const docs = await fetchCategoryEquipment(cid);
    // 收集该分类下所有设备的所有文档（平铺）
    const all: { title: string; file_type: string; equipment_id: number }[] = [];
    for (const eq of docs) {
      const eqDocs = await fetchDocuments(eq.equipment.id).catch(() => []);
      for (const d of eqDocs) {
        all.push({ title: d.title, file_type: d.file_type, equipment_id: d.equipment_id });
      }
    }
    return all;
  }

  const categories = await fetchCategories().catch(() => [] as CategoryNode[]);
  const category = findCategory(categories, categoryId);
  const path = findPath(categories, categoryId);
  if (!category) notFound();

  const [equipment, documents] = await Promise.all([
    fetchCategoryEquipment(id).catch(() => []),
    fetchDocumentsForCategory(id).catch(() => null),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/categories"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        ← 返回分类导航
      </Link>

      {/* ---- 分类介绍 ---- */}
      <header className="mb-8">
        {/* 面包屑 */}
        <nav aria-label="分类路径" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/categories" className="hover:text-primary hover:underline">
            分类
          </Link>
          {path?.slice(1).map((item) => (
            <span key={item.id} className="flex items-center gap-1.5">
              <span className="text-muted-foreground/60">&gt;</span>
              {item.id === categoryId ? (
                <span className="font-medium text-foreground">{item.name}</span>
              ) : (
                <Link href={`/categories/${item.id}`} className="hover:text-primary hover:underline">
                  {item.name}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {category.description || "暂无分类介绍"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {equipment.length} 台设备（含子分类）
        </p>
      </header>

      {/* ---- 子分类 ---- */}
      {category.children.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
            子分类
          </h2>
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.id}`}
                className="rounded-full border px-3 py-1 text-sm hover:border-primary hover:text-primary"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- 设备列表 ---- */}
      <section className="mb-8">
        <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
          设备列表
        </h2>
        {equipment.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((eq) => (
              <EquipmentCard key={eq.equipment.id} equipment={eq} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            该分类下暂无设备
          </p>
        )}
      </section>

      {/* ---- 相关资料（分类下设备的文档） ---- */}
      {documents && documents.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
            相关资料
          </h2>
          <ul className="divide-y rounded-md border">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate font-medium">{doc.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="uppercase">
                    {doc.file_type}
                  </Badge>
                  <Link
                    href={`/equipment/${doc.equipment_id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    查看设备
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
