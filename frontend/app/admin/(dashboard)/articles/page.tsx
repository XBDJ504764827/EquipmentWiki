"use client";

import { useEffect, useState } from "react";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AdminApiError, adminRequest } from "@/lib/admin-api";
import {
  ARTICLE_TYPE_LABELS,
  fetchArticles,
  fetchEquipmentList,
  type Article,
  type ArticleType,
} from "@/lib/api";

/** 空表单 */
const EMPTY = {
  title: "",
  equipment_id: "",
  article_type: "repair" as ArticleType,
  content: "",
};

/**
 * 文章管理页：
 * 列表 + 新增/编辑（Markdown 编辑 + 实时预览）+ 删除。
 */
export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const data = await fetchArticles({ page: 1, limit: 100 });
      setArticles(data.items.map((i) => i.article));
    } catch {
      toast.error("加载文章失败");
    }
  }

  useEffect(() => {
    load();
    fetchEquipmentList(1, 100)
      .then((d) => setEquipmentList(d.items.map((i) => ({ id: i.equipment.id, name: i.equipment.name }))))
      .catch(() => {});
  }, []);

  function startEdit(article: Article) {
    setEditingId(article.id);
    setForm({
      title: article.title,
      equipment_id: article.equipment_id != null ? String(article.equipment_id) : "",
      article_type: article.article_type,
      content: article.content,
    });
    setShowPreview(false);
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setShowPreview(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        equipment_id: form.equipment_id ? Number(form.equipment_id) : null,
        type: form.article_type,
        content: form.content,
      };
      if (editingId != null) {
        await adminRequest(`/api/admin/articles/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("文章已更新");
      } else {
        await adminRequest("/api/admin/articles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("文章已发布");
      }
      reset();
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (deleteTarget == null) return;
    setDeleting(true);
    try {
      await adminRequest(`/api/admin/articles/${deleteTarget}`, { method: "DELETE" });
      toast.success("文章已删除");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const labelCls = "mb-1.5 block text-sm font-medium text-muted-foreground";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* ---- 文章列表 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">文章列表（{articles.length}）</h3>
        {articles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无文章</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ARTICLE_TYPE_LABELS[a.article_type]} · {a.slug}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button type="button" className="text-primary hover:underline" onClick={() => startEdit(a)}>
                    编辑
                  </button>
                  <button type="button" className="text-destructive hover:underline" onClick={() => setDeleteTarget(a.id)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- 新增/编辑表单 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">{editingId != null ? `编辑文章 #${editingId}` : "新增文章"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>标题 *</label>
              <input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>关联设备</label>
              <select className={inputCls} value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}>
                <option value="">通用（不关联）</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>文章类型</label>
              <select
                className={inputCls}
                value={form.article_type}
                onChange={(e) => setForm({ ...form, article_type: e.target.value as ArticleType })}
              >
                {Object.entries(ARTICLE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Markdown 内容</label>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {showPreview ? "回到编辑" : "预览"}
              </button>
            </div>
            {showPreview ? (
              <div className="rounded-lg border p-4">
                <MarkdownRenderer content={form.content || "*（空内容）*"} />
              </div>
            ) : (
              <textarea
                className="min-h-64 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring"
                placeholder={"# 标题\n\n支持 Markdown：列表、表格、代码块、引用…"}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={cn(buttonVariants(), saving && "opacity-60")}>
              {saving ? "保存中…" : editingId != null ? "保存修改" : "发布文章"}
            </button>
            {editingId != null && (
              <button type="button" onClick={reset} className={cn(buttonVariants({ variant: "outline" }))}>
                取消编辑
              </button>
            )}
          </div>
        </form>
      </section>

      {/* 删除确认 */}
      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除文章</DialogTitle>
            <DialogDescription>删除文章 #{deleteTarget} 不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }))} onClick={() => setDeleteTarget(null)}>
              取消
            </button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }), deleting && "opacity-60")}
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "删除中…" : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
