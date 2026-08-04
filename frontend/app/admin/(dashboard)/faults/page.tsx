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
import { fetchEquipmentList, fetchFaults, type Fault } from "@/lib/api";

const EMPTY = { equipment_id: "", title: "", symptom: "", reason: "", solution: "" };

/**
 * 故障管理页：
 * 选择设备 → 显示其故障列表；新增/编辑（标题/症状/原因/解决方案）/删除。
 */
export default function AdminFaultsPage() {
  const [equipmentList, setEquipmentList] = useState<{ id: number; name: string }[]>([]);
  const [equipmentId, setEquipmentId] = useState("");
  const [faults, setFaults] = useState<Fault[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEquipmentList(1, 100)
      .then((d) => setEquipmentList(d.items.map((i) => ({ id: i.equipment.id, name: i.equipment.name }))))
      .catch(() => {});
  }, []);

  async function loadFaults(eqId: string) {
    setEquipmentId(eqId);
    setForm(EMPTY);
    setEditingId(null);
    if (!eqId) {
      setFaults([]);
      return;
    }
    try {
      setFaults(await fetchFaults(eqId));
    } catch {
      toast.error("加载故障失败");
    }
  }

  function startEdit(fault: Fault) {
    setEditingId(fault.id);
    setForm({
      equipment_id: String(fault.equipment_id),
      title: fault.title,
      symptom: fault.symptom,
      reason: fault.reason,
      solution: fault.solution,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        equipment_id: Number(form.equipment_id),
        title: form.title,
        symptom: form.symptom,
        reason: form.reason,
        solution: form.solution,
      };
      if (editingId != null) {
        await adminRequest(`/api/admin/faults/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.success("故障已更新");
      } else {
        await adminRequest("/api/admin/faults", { method: "POST", body: JSON.stringify(payload) });
        toast.success("故障已添加");
      }
      setForm(EMPTY);
      setEditingId(null);
      loadFaults(form.equipment_id);
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
      await adminRequest(`/api/admin/faults/${deleteTarget}`, { method: "DELETE" });
      toast.success("故障已删除");
      setDeleteTarget(null);
      loadFaults(equipmentId);
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
      {/* ---- 设备选择 + 故障列表 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">选择设备</h3>
        <select
          className={cn(inputCls, "mb-4")}
          value={equipmentId}
          onChange={(e) => loadFaults(e.target.value)}
        >
          <option value="">选择设备…</option>
          {equipmentList.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name}
            </option>
          ))}
        </select>

        {equipmentId && (
          <>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">故障列表（{faults.length}）</h4>
            {faults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无故障</p>
            ) : (
              <ul className="space-y-2">
                {faults.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{f.symptom}</p>
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button type="button" className="text-primary hover:underline" onClick={() => startEdit(f)}>
                        编辑
                      </button>
                      <button type="button" className="text-destructive hover:underline" onClick={() => setDeleteTarget(f.id)}>
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ---- 新增/编辑表单 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">{editingId != null ? `编辑故障 #${editingId}` : "新增故障"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>故障标题 *</label>
            <input required className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：设备无法启动" />
          </div>
          <div>
            <label className={labelCls}>故障现象</label>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" rows={2} value={form.symptom} onChange={(e) => setForm({ ...form, symptom: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>可能原因</label>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>解决方案</label>
            <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none" rows={3} value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className={cn(buttonVariants(), saving && "opacity-60")}>
              {saving ? "保存中…" : editingId != null ? "保存修改" : "添加故障"}
            </button>
            {editingId != null && (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className={cn(buttonVariants({ variant: "outline" }))}>
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
            <DialogTitle>确认删除故障</DialogTitle>
            <DialogDescription>删除故障 #{deleteTarget} 不可恢复。</DialogDescription>
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
