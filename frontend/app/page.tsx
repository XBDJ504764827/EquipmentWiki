import Link from "next/link";

import { SearchBox } from "@/components/SearchBox";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 首页：项目名 + 全局搜索入口 + 设备库入口 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          EquipmentWiki
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">设备维修知识库</p>
      </div>

      {/* 全局搜索入口 */}
      <SearchBox large />

      {/* 设备库入口 */}
      <Link
        href="/equipment"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        浏览全部设备
      </Link>
    </main>
  );
}
