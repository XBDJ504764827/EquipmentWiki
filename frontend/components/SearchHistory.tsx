"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SEARCH_HISTORY_KEY } from "@/components/SearchBox";

/**
 * 本地搜索历史（客户端组件）：
 * 读取 localStorage 中的历史关键词，点击可快速重新搜索，支持一键清除。
 */
export function SearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) ?? "[]"));
    } catch {
      setHistory([]);
    }
  }, []);

  if (history.length === 0) return null;

  function clear() {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // ignore
    }
    setHistory([]);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground">搜索历史：</span>
      {history.map((kw) => (
        <Link
          key={kw}
          href={`/search?keyword=${encodeURIComponent(kw)}`}
          className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary"
        >
          {kw}
        </Link>
      ))}
      <button
        type="button"
        onClick={clear}
        className="text-xs text-muted-foreground hover:text-destructive"
      >
        清除
      </button>
    </div>
  );
}
