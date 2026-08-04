"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/** 主题选项：浅色 / 深色 / 跟随系统 */
const OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "系统", icon: Laptop },
] as const;

interface ThemeToggleProps {
  /** 紧凑模式（用于导航栏） */
  compact?: boolean;
  /** 深色背景上使用（如深色头部导航） */
  onDark?: boolean;
}

/**
 * 主题切换按钮：点击循环 浅色 → 深色 → 系统，当前模式图标显示。
 * 桌面端放顶部导航；移动端作为悬浮按钮（避开底部导航）。
 */
export function ThemeToggle({ compact = false, onDark = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  function cycle() {
    const idx = OPTIONS.findIndex((o) => o.value === theme);
    const next = OPTIONS[(idx + 1) % OPTIONS.length];
    setTheme(next.value);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`主题：${current.label}，点击切换`}
      title={`主题：${current.label}`}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md border transition-all active:scale-95",
        onDark
          ? "border-primary-foreground/25 text-primary-foreground/75 hover:border-primary-foreground/50 hover:text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary",
        compact ? "size-9" : "h-9 px-3 text-sm",
      )}
    >
      {mounted ? <CurrentIcon className="size-4" /> : <Sun className="size-4" />}
      {!compact && <span className="hidden sm:inline">{mounted ? current.label : "主题"}</span>}
    </button>
  );
}
