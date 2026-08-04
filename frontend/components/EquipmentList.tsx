import Link from "next/link";

import { EquipmentCard } from "@/components/EquipmentCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EquipmentListResult } from "@/lib/api";

interface EquipmentListProps {
  /** 分页数据 */
  data: EquipmentListResult;
}

/**
 * 设备列表：响应式卡片网格 + 上一页/下一页分页。
 * 分页通过 URL query 参数实现（/equipment?page=N），
 * 页面本身是服务端渲染，翻页即重新请求。
 */
export function EquipmentList({ data }: EquipmentListProps) {
  const { items, page, limit, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <p className="text-sm text-muted-foreground">
        共 {total} 台设备 · 第 {page} / {totalPages} 页
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          暂无设备数据
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((equipment) => (
            <EquipmentCard key={equipment.id} equipment={equipment} />
          ))}
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={page > 1 ? `/equipment?page=${page - 1}` : "#"}
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
            href={page < totalPages ? `/equipment?page=${page + 1}` : "#"}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page >= totalPages && "pointer-events-none opacity-50",
            )}
          >
            下一页
          </Link>
        </div>
      )}
    </div>
  );
}
