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
import { AdminApiError, adminRequest, adminUpload } from "@/lib/admin-api";
import {
  CATEGORY_LABELS,
  fetchDocuments,
  fetchEquipmentList,
  type Document,
  type EquipmentWithCategory,
} from "@/lib/api";

/** 上传大小上限（MB） */
const MAX_MB = 100;

/**
 * 资料管理页：
 * - 上传表单：选择设备/分类，填写标题描述，选择文件（先传文件再保存记录）
 * - 设备资料列表：选择设备查看其资料，支持删除
 */
export default function AdminDocumentsPage() {
  const [equipmentList, setEquipmentList] = useState<EquipmentWithCategory[]>([]);
  const [equipmentId, setEquipmentId] = useState("");
  const [category, setCategory] = useState("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [listEquipmentId, setListEquipmentId] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEquipmentList(1, 100)
      .then((d) => setEquipmentList(d.items))
      .catch(() => {});
  }, []);

  async function loadDocuments(eqId: string) {
    if (!eqId) {
      setDocuments([]);
      return;
    }
    try {
      setDocuments(await fetchDocuments(eqId));
    } catch {
      toast.error("加载资料失败");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("请选择文件");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`文件超过 ${MAX_MB}MB 上限`);
      return;
    }
    setUploading(true);
    try {
      // 1. 上传文件获取 URL
      const uploaded = await adminUpload(file);
      // 2. 保存资料记录
      await adminRequest("/api/admin/documents", {
        method: "POST",
        body: JSON.stringify({
          equipment_id: Number(equipmentId),
          title,
          description,
          category,
          file_url: uploaded.file_url,
          file_type: uploaded.file_type,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
        }),
      });
      toast.success("资料上传成功");
      setTitle("");
      setDescription("");
      setFile(null);
      loadDocuments(listEquipmentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (deleteTarget == null) return;
    setDeleting(true);
    try {
      await adminRequest(`/api/admin/documents/${deleteTarget}`, { method: "DELETE" });
      toast.success("资料已删除");
      setDeleteTarget(null);
      loadDocuments(listEquipmentId);
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
    <div className="space-y-8">
      {/* ---- 上传表单 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">上传资料</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>关联设备 *</label>
              <select required className={inputCls} value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
                <option value="">选择设备…</option>
                {equipmentList.map(({ equipment: eq }) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}（{eq.model}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>资料分类</label>
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>标题 *</label>
              <input required className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：使用说明书" />
            </div>
            <div>
              <label className={labelCls}>文件 *（PDF/图片/视频/CAD/压缩包）</label>
              <input
                required
                type="file"
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>描述</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" disabled={uploading} className={cn(buttonVariants(), uploading && "opacity-60")}>
            {uploading ? "上传中…" : "上传资料"}
          </button>
        </form>
      </section>

      {/* ---- 设备资料列表 ---- */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">设备资料管理</h3>
        <div className="mb-4 max-w-sm">
          <select
            className={inputCls}
            value={listEquipmentId}
            onChange={(e) => {
              setListEquipmentId(e.target.value);
              loadDocuments(e.target.value);
            }}
          >
            <option value="">选择设备查看资料…</option>
            {equipmentList.map(({ equipment: eq }) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
        </div>

        {listEquipmentId && (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      该设备暂无资料
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>{CATEGORY_LABELS[doc.category] ?? doc.category}</TableCell>
                      <TableCell className="uppercase text-muted-foreground">{doc.file_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.file_size > 0 ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <a href={`/document/${doc.id}`} className="mr-3 text-sm text-primary hover:underline">
                          查看
                        </a>
                        <button
                          type="button"
                          className="text-sm text-destructive hover:underline"
                          onClick={() => setDeleteTarget(doc.id)}
                        >
                          删除
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* 删除确认 */}
      <Dialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除资料</DialogTitle>
            <DialogDescription>删除资料 #{deleteTarget} 将同时删除已上传的文件，不可恢复。</DialogDescription>
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
