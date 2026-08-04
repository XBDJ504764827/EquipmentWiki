"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Wrench } from "lucide-react";
import { useState } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { clearAdminToken } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

/** 页面标题映射（用于顶部导航） */
const TITLES: Record<string, string> = {
  "/admin": "后台首页",
  "/admin/equipment": "设备管理",
  "/admin/documents": "资料管理",
  "/admin/articles": "文章管理",
  "/admin/faults": "故障管理",
  "/admin/categories": "分类管理",
  "/admin/tags": "标签管理",
};

/**
 * 后台管理布局：
 * - 桌面端：左侧边栏 + 顶部导航 + 内容区
 * - 移动端：顶部汉堡菜单展开侧边栏
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const title = Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "后台管理";

  function logout() {
    clearAdminToken();
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* 移动端侧边栏（抽屉） */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div className="h-full w-56 bg-background" onClick={(e) => e.stopPropagation()}>
            <AdminSidebar />
          </div>
        </div>
      )}

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="打开菜单"
            >
              <Menu className="size-5" />
            </button>
            <Link href="/admin" className="flex items-center gap-2 font-semibold lg:hidden">
              <Wrench className="size-5 text-primary" />
              后台
            </Link>
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              前台首页 ↗
            </Link>
            <button
              type="button"
              onClick={logout}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm",
                "transition-colors hover:border-destructive/50 hover:text-destructive",
              )}
            >
              <LogOut className="size-4" />
              退出
            </button>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
