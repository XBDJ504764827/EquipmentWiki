"use client";

import { useEffect, useState } from "react";

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
import { fetchTags, type Tag } from "@/lib/api";

/**
 * 标签管理页：标签列表（含设备数量）+ 新增/编辑/删除。
 */
export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setTags(await fetchTags().catch(() => []));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("请输入标签名称");
      return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        await adminRequest(`/api/admin/tags/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("标签已更新");
      } else {
        await adminRequest("/api/admin/tags", { method: "POST", body: JSON.stringify(form) });
        toast.success("标签已创建");
      }
      setForm({ name: "", description: "" });
      setEditingId(null);
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
      await adminRequest(`/api/admin/tags/${deleteTarget}`, { method: "DELETE" });
      toast.success("标签已删除");
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- 标签列表 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">标签列表（{tags.length}）</h3>
        {tags.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无标签</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                {t.name}
                <span className="text-xs text-muted-foreground">×{t.equipment_count ?? 0}</span>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setEditingId(t.id); setForm({ name: t.name, description: t.description }); }}>
                  改
                </button>
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setDeleteTarget(t.id)}>
                  删
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- 新增/编辑 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">{editingId != null ? `编辑标签 #${editingId}` : "新增标签"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>标签名称 *</label>
            <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={cn(buttonVariants(), saving && "opacity-60")}>
              {saving ? "保存中…" : editingId != null ? "保存修改" : "创建标签"}
            </button>
            {editingId != null && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); }} className={cn(buttonVariants({ variant: "outline" }))}>
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
            <DialogTitle>确认删除标签</DialogTitle>
            <DialogDescription>删除标签 #{deleteTarget} 将同时移除所有设备上的该标签关联。</DialogDescription>
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
