"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface AccordionPanelProps {
  /** 面板标题（含 emoji，如 📄 说明书） */
  title: string;
  /** 默认是否展开 */
  defaultOpen?: boolean;
  /** 内容区 id（供快速操作按钮锚点展开） */
  id?: string;
  children: React.ReactNode;
}

/**
 * 移动端折叠面板（Accordion）：
 * 设备详情页资料区域使用——说明书/故障方案/维修文章等分区可折叠，
 * 减少滚动，快速定位。快速操作按钮通过锚点 #id 自动展开对应面板。
 */
export function AccordionPanel({ title, defaultOpen = false, id, children }: AccordionPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = { current: null as HTMLDivElement | null };

  // 支持锚点自动展开（#id 跳转）
  useEffect(() => {
    if (!id) return;
    const onHash = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
        setTimeout(() => {
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, [id]);

  return (
    <div id={id} ref={ref as React.RefObject<HTMLDivElement>} className="scroll-mt-4 overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </div>
  );
}
