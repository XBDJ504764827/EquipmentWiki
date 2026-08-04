"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderTree, Home, MoreHorizontal, Search } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/** 底部导航项（移动端）：首页 / 搜索 / 分类 / 资料 / 更多 */
const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/search", label: "搜索", icon: Search },
  { href: "/categories", label: "分类", icon: FolderTree },
  { href: "/articles", label: "资料", icon: BookOpen },
  { href: "/equipment", label: "更多", icon: MoreHorizontal },
];

/**
 * 移动端底部固定导航（Bottom Navigation）：
 * 单手操作友好；桌面端隐藏。
 */
export function MobileNav() {
  const pathname = usePathname();

  // 后台管理页面不显示前台底部导航
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* 移动端悬浮主题切换（避开底部导航） */}
      <div className="fixed bottom-20 right-4 z-40 lg:hidden">
        <ThemeToggle compact />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors",
                active
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      </nav>
    </>
  );
}
