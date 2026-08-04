import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { CategoryFilter } from "@/components/CategoryFilter";
import { EquipmentList } from "@/components/EquipmentList";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError, fetchCategories, fetchEquipmentList } from "@/lib/api";

export const metadata: Metadata = {
  title: "设备列表 - EquipmentWiki",
  description: "设备维修知识库 · 设备信息查询",
};

interface EquipmentPageProps {
  searchParams: Promise<{ page?: string; category_id?: string }>;
}

/**
 * 设备列表页：服务端获取数据并渲染。
 * - 顶部分类筛选条（全部 + 一级分类 + 子分类），URL query 驱动
 * - 分页通过 ?page=N 控制，且保留分类筛选参数
 */
export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const { page: pageParam, category_id } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const categoryId = category_id ? Number(category_id) : null;

  const [categories, data] = await Promise.all([
    fetchCategories().catch(() => []),
    fetchEquipmentList(page, 12, categoryId ?? undefined).catch((err: unknown) => {
      return { error: err instanceof ApiError ? err.message : "加载设备列表失败，请稍后重试" };
    }),
  ]);

  const error = "error" in data ? data.error : null;
  const listData = "error" in data ? null : data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设备列表</h1>
          <p className="mt-1 text-muted-foreground">查询设备信息与维修资料</p>
        </div>
        {/* 返回搜索入口 */}
        <Link
          href="/search"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <Search className="size-4" />
          返回搜索
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
        {/* ---- 左侧分类导航 ---- */}
        <aside className="mb-6 lg:mb-0">
          {categories.length > 0 && (
            <div className="rounded-lg border p-3 lg:sticky lg:top-4">
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                设备分类
              </h2>
              <CategoryFilter categories={categories} selectedId={categoryId} />
            </div>
          )}
        </aside>

        {/* ---- 右侧设备列表 ---- */}
        <section>
          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-16 text-center text-destructive">
              {error}
            </div>
          ) : (
            <EquipmentList data={listData!} categoryId={categoryId} />
          )}
        </section>
      </div>
    </main>
  );
}
