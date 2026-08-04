import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/lib/api";

/** 设备卡片：封面图 + 名称、型号、厂家、分类 + 查看详情入口 */
export function EquipmentCard({ equipment }: { equipment: Equipment }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {/* 封面图（未配置时显示占位） */}
      <div className="relative h-36 w-full bg-muted/40">
        {equipment.cover_image ? (
          <Image
            src={equipment.cover_image}
            alt={equipment.name}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            暂无图片
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{equipment.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {equipment.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-1.5 pb-3 text-sm text-muted-foreground">
        <p>
          <span className="text-foreground">型号：</span>
          {equipment.model || "—"}
        </p>
        <p>
          <span className="text-foreground">厂家：</span>
          {equipment.manufacturer || "—"}
        </p>
      </CardContent>

      <CardFooter>
        <Link
          href={`/equipment/${equipment.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          查看详情
        </Link>
      </CardFooter>
    </Card>
  );
}
