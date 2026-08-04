"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  FileText,
  FolderTree,
  LayoutDashboard,
  Tags,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** 后台侧边菜单项 */
const NAV_ITEMS = [
  { href: "/admin", label: "后台首页", icon: LayoutDashboard },
  { href: "/admin/equipment", label: "设备管理", icon: Boxes },
  { href: "/admin/documents", label: "资料管理", icon: FileText },
  { href: "/admin/articles", label: "文章管理", icon: BookOpen },
  { href: "/admin/faults", label: "故障管理", icon: TriangleAlert },
  { href: "/admin/categories", label: "分类管理", icon: FolderTree },
  { href: "/admin/tags", label: "标签管理", icon: Tags },
];

/**
 * 后台侧边栏：管理菜单导航（设备/资料/文章/故障/分类/标签）。
 * 高亮当前激活项。
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/30 lg:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Wrench className="size-5 text-primary" />
          EquipmentWiki 后台
        </Link>
      </div>
      <nav className="space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
