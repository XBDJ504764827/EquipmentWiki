"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** localStorage 键：搜索历史 */
export const SEARCH_HISTORY_KEY = "equipmentwiki_search_history";

/** 搜索历史最大条数 */
const HISTORY_MAX = 10;

/** 把关键词写入本地搜索历史（去重、最新在前） */
export function saveSearchHistory(keyword: string) {
  try {
    const list: string[] = JSON.parse(
      localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]",
    );
    const next = [keyword, ...list.filter((k) => k !== keyword)].slice(0, HISTORY_MAX);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

interface SearchBoxProps {
  /** 初始关键词（从 URL 带入） */
  initialKeyword?: string;
  /** 是否大号样式（首页/搜索页顶部） */
  large?: boolean;
}

/**
 * 全局搜索框（客户端组件）：
 * 提交后跳转 /search?keyword=...，并把关键词写入本地搜索历史。
 */
export function SearchBox({ initialKeyword = "", large = false }: SearchBoxProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialKeyword);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kw = keyword.trim();
    if (!kw) return;
    saveSearchHistory(kw);
    router.push(`/search?keyword=${encodeURIComponent(kw)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索设备型号、故障、说明书…"
        aria-label="搜索设备型号、故障、说明书"
        className={cn(
          "w-full rounded-lg border border-input bg-background px-4 text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          large ? "h-12 text-base" : "h-9 text-sm",
        )}
      />
      <button
        type="submit"
        className={cn(
          buttonVariants({ size: large ? "lg" : "sm" }),
          "shrink-0",
        )}
      >
        搜索
      </button>
    </form>
  );
}
