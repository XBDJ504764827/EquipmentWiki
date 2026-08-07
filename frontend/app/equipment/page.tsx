import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { EquipmentList } from "@/components/EquipmentList";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError, fetchEquipmentList } from "@/lib/api";

export const metadata: Metadata = {
  title: "设备列表 - EquipmentWiki",
  description: "设备维修知识库 · 设备信息查询",
};

interface EquipmentPageProps {
  searchParams: Promise<{ page?: string }>;
}

/** 设备列表页：服务端获取数据并渲染，分页通过 ?page=N 控制 */
export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const data = await fetchEquipmentList(page, 12).catch((err: unknown) => {
    return { error: err instanceof ApiError ? err.message : "加载设备列表失败，请稍后重试" };
  });

  const error = "error" in data ? data.error : null;
  const listData = "error" in data ? null : data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 lg:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设备列表</h1>
          <p className="mt-1 text-muted-foreground">查询设备信息与维修资料</p>
        </div>
        {/* 返回搜索入口 */}
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <Search className="size-4" />
          返回搜索
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-10 text-center text-destructive lg:py-16">
          {error}
        </div>
      ) : (
        <EquipmentList data={listData!} />
      )}
    </main>
  );
}
