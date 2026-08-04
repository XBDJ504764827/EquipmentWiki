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
import { fetchCategories, type CategoryNode } from "@/lib/api";

/** 分类树扁平化（含层级） */
function flatten(nodes: CategoryNode[], depth = 0, list: { id: number; name: string; label: string; parent_id: number | null; depth: number }[] = []): typeof list {
  for (const n of nodes) {
    list.push({ id: n.id, name: n.name, label: `${"　".repeat(depth)}${n.name}`, parent_id: null, depth });
    flatten(n.children, depth + 1, list);
  }
  return list;
}

/**
 * 分类管理页：分类树展示 + 新增/编辑（名称/父分类/描述）/删除。
 */
export default function AdminCategoriesPage() {
  const [flat, setFlat] = useState<ReturnType<typeof flatten>>([]);
  const [form, setForm] = useState({ name: "", parent_id: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const tree = await fetchCategories().catch(() => []);
    setFlat(flatten(tree));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(id: number) {
    const item = flat.find((f) => f.id === id);
    if (!item) return;
    setEditingId(id);
    setForm({ name: item.name, parent_id: "", description: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("请输入分类名称");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        description: form.description,
      };
      if (editingId != null) {
        await adminRequest(`/api/admin/categories/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("分类已更新");
      } else {
        await adminRequest("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) });
        toast.success("分类已创建");
      }
      setForm({ name: "", parent_id: "", description: "" });
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
      await adminRequest(`/api/admin/categories/${deleteTarget}`, { method: "DELETE" });
      toast.success("分类已删除");
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
      {/* ---- 分类树 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">分类结构（{flat.length}）</h3>
        {flat.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无分类</p>
        ) : (
          <ul className="space-y-1">
            {flat.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                <span className="text-sm">{c.label}</span>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button type="button" className="text-primary hover:underline" onClick={() => startEdit(c.id)}>
                    编辑
                  </button>
                  <button type="button" className="text-destructive hover:underline" onClick={() => setDeleteTarget(c.id)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- 新增/编辑 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">{editingId != null ? `编辑分类 #${editingId}` : "新增分类"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>分类名称 *</label>
            <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>父分类</label>
            <select className={inputCls} value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
              <option value="">（根分类）</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={cn(buttonVariants(), saving && "opacity-60")}>
              {saving ? "保存中…" : editingId != null ? "保存修改" : "创建分类"}
            </button>
            {editingId != null && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: "", parent_id: "", description: "" }); }} className={cn(buttonVariants({ variant: "outline" }))}>
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
            <DialogTitle>确认删除分类</DialogTitle>
            <DialogDescription>删除分类 #{deleteTarget} 将级联删除其子分类，相关设备将变为未分类。</DialogDescription>
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
