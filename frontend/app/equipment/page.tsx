import type { Metadata } from "next";

import { EquipmentList } from "@/components/EquipmentList";
import { ApiError, fetchEquipmentList } from "@/lib/api";

export const metadata: Metadata = {
  title: "设备列表 - EquipmentWiki",
  description: "设备维修知识库 · 设备信息查询",
};

interface EquipmentPageProps {
  searchParams: Promise<{ page?: string }>;
}

/** 设备列表页：服务端获取数据并渲染（分页通过 ?page=N 控制） */
export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  try {
    const data = await fetchEquipmentList(page, 12);
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">设备列表</h1>
        <p className="mb-6 text-muted-foreground">查询设备信息与维修资料</p>
        <EquipmentList data={data} />
      </main>
    );
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : "加载设备列表失败，请稍后重试";
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">设备列表</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 py-16 text-center text-destructive">
          {message}
        </div>
      </main>
    );
  }
}
