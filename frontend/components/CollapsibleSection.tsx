"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  /** 区块标题（如：设备） */
  title: string;
  /** 命中数量 */
  count: number;
  /** 默认是否展开 */
  defaultOpen?: boolean;
  /** 内容区域 id（供快速操作锚点跳转） */
  id?: string;
  children: React.ReactNode;
}

/**
 * 可折叠结果区块：
 * 搜索结果按分类折叠展示（移动端优先——减少页面滚动，快速定位）。
 * 点击标题栏展开/收起。
 */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  id,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  // 支持外部锚点跳转（快速操作按钮跳转时自动展开）
  useEffect(() => {
    if (!id) return;
    const onHash = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
        setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);

  return (
    <section id={id} ref={ref} className="scroll-mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <span className="border-l-4 border-primary pl-2.5 text-base font-semibold">
          {title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{count} 条</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}
