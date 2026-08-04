"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminRequest, setAdminToken } from "@/lib/admin-api";

/**
 * 后台登录页：
 * 输入 ADMIN_TOKEN 并验证（调用管理接口探测），通过后存入 localStorage 并进入后台。
 * 第一阶段简单令牌认证；未来可替换为 JWT 管理员账号。
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    setError(null);

    try {
      // 用最小的管理操作探测令牌有效性（验证失败会返回 401）
      setAdminToken(t);
      await adminRequest<unknown>("/api/admin/verify");
      router.replace("/admin");
    } catch (err) {
      setAdminToken("");
      setError(err instanceof Error ? err.message : "令牌验证失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">EquipmentWiki 后台</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          请输入管理员访问令牌（ADMIN_TOKEN）
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="管理令牌"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className={cn(buttonVariants({ className: "w-full" }), loading && "opacity-60")}
          >
            {loading ? "验证中…" : "进入后台"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            返回前台首页
          </Link>
        </p>
      </div>
    </div>
  );
}
