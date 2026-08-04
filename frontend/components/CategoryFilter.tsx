"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/lib/api";

interface CategoryFilterProps {
  /** 分类树 */
  categories: CategoryNode[];
  /** 当前选中的分类 ID（null = 全部） */
  selectedId: number | null;
}

/**
 * 分类筛选（左侧列式导航）：
 * - "全部设备"：独立按钮样式（图标 + 底色块），与分类项明显区分
 * - 分类树可折叠：子分类默认隐藏，点击箭头展开/收起
 * - 初始展开选中分类的祖先路径，保证当前选中项可见
 * - 叶子分类（无子分类）不显示箭头
 */
export function CategoryFilter({ categories, selectedId }: CategoryFilterProps) {
  // 初始展开集合：选中分类的祖先路径
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const init = new Set<number>();
    if (selectedId != null) {
      const collectAncestors = (nodes: CategoryNode[], ancestors: number[]): boolean => {
        for (const n of nodes) {
          if (n.id === selectedId) {
            ancestors.forEach((a) => init.add(a));
            return true;
          }
          if (collectAncestors(n.children, [...ancestors, n.id])) return true;
        }
        return false;
      };
      collectAncestors(categories, []);
    }
    return init;
  });

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** 递归渲染分类树 */
  const renderNodes = (nodes: CategoryNode[], depth: number) =>
    nodes.map((cat) => {
      const hasChildren = cat.children.length > 0;
      const isExpanded = expanded.has(cat.id);
      return (
        <div key={cat.id}>
          <div className="flex items-center">
            {/* 展开/收起箭头（仅含子分类的分类显示） */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(cat.id)}
                aria-label={isExpanded ? `收起 ${cat.name}` : `展开 ${cat.name}`}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="w-6 shrink-0" aria-hidden />
            )}

            <Link
              href={`/equipment?category_id=${cat.id}`}
              className={cn(
                "block w-full rounded-md py-1.5 pr-2 text-sm transition-colors",
                selectedId === cat.id
                  ? "border-l-2 border-primary bg-primary/10 font-medium text-primary"
                  : "text-foreground/80 hover:bg-muted hover:text-primary",
              )}
              style={{ paddingLeft: `${Math.min(depth * 4 + 2, 12)}px` }}
            >
              {cat.name}
              {hasChildren && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {cat.children.length}
                </span>
              )}
            </Link>
          </div>

          {/* 子分类（默认隐藏，展开后显示） */}
          {hasChildren && isExpanded && renderNodes(cat.children, depth + 1)}
        </div>
      );
    });

  return (
    <nav aria-label="设备分类">
      {/* "全部设备"：独立按钮样式，与分类项区分 */}
      <Link
        href="/equipment"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          selectedId == null
            ? "bg-primary text-primary-foreground shadow-sm"
            : "border border-border bg-muted/40 text-foreground hover:border-primary/60 hover:text-primary",
        )}
      >
        <LayoutGrid className="size-4 shrink-0" />
        全部设备
      </Link>

      {/* 分隔线 */}
      <div className="my-2 border-t" />

      <div className="space-y-0.5">{renderNodes(categories, 0)}</div>
    </nav>
  );
}
