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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AdminApiError, adminRequest } from "@/lib/admin-api";
import { fetchEquipmentList, type EquipmentWithCategory } from "@/lib/api";

/**
 * 设备管理列表页：
 * 表格展示设备（名称/型号/厂家/分类/创建时间），操作：新增/编辑/删除/查看。
 */
export default function AdminEquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchEquipmentList(1, 100);
      setEquipment(data.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDelete() {
    if (deleteTarget == null) return;
    setDeleting(true);
    try {
      await adminRequest(`/api/admin/equipment/${deleteTarget}`, { method: "DELETE" });
      toast.success("设备已删除");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {equipment.length} 台设备</p>
        <a href="/admin/equipment/create" className={cn(buttonVariants({ size: "sm" }))}>
          ＋ 新增设备
        </a>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>设备名称</TableHead>
              <TableHead>型号</TableHead>
              <TableHead>厂家</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  加载中…
                </TableCell>
              </TableRow>
            ) : equipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  暂无设备
                </TableCell>
              </TableRow>
            ) : (
              equipment.map(({ equipment: eq, category_name }) => (
                <TableRow key={eq.id}>
                  <TableCell className="text-muted-foreground">{eq.id}</TableCell>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell>{eq.model}</TableCell>
                  <TableCell>{eq.manufacturer}</TableCell>
                  <TableCell>{category_name ?? "未分类"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(eq.created_at).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <a href={`/equipment/${eq.id}`} className="text-sm text-primary hover:underline">
                        查看
                      </a>
                      <a
                        href={`/admin/equipment/${eq.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        编辑
                      </a>
                      <button
                        type="button"
                        className="text-sm text-destructive hover:underline"
                        onClick={() => setDeleteTarget(eq.id)}
                      >
                        删除
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 删除确认 */}
      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除设备 #{deleteTarget} 将同时删除其资料、故障、维护与文章关联（文章将变为通用）。
              此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              onClick={() => setDeleteTarget(null)}
            >
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
