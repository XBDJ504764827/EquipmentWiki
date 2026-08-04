"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminApiError, adminRequest } from "@/lib/admin-api";
import { fetchCategories, fetchTags, type CategoryNode, type Tag } from "@/lib/api";

interface EquipmentFormProps {
  /** 编辑模式：传入设备 ID 时预填表单 */
  equipmentId?: number;
}

/** 分类树扁平化（缩进显示层级） */
function flatten(nodes: CategoryNode[], depth = 0): { id: number; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${"　".repeat(depth)}${n.name}` },
    ...flatten(n.children, depth + 1),
  ]);
}

/**
 * 设备表单（新增/编辑共用）：
 * 字段：名称 / 型号 / 厂家 / 分类 / 标签(多选) / 描述 / 封面图片。
 */
export function EquipmentForm({ equipmentId }: EquipmentFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: number; label: string }[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    model: "",
    manufacturer: "",
    category_id: "",
    description: "",
    cover_image: "",
    tag_ids: [] as number[],
  });
  const [error, setError] = useState<string | null>(null);

  // 加载分类/标签选项；编辑模式预填
  useEffect(() => {
    fetchCategories()
      .then((tree) => setCategories(flatten(tree)))
      .catch(() => {});
    fetchTags()
      .then((t) => setTags(t))
      .catch(() => {});

    if (equipmentId != null) {
      import("@/lib/api").then(async ({ fetchEquipmentDetail }) => {
        try {
          const detail = await fetchEquipmentDetail(equipmentId);
          setForm({
            name: detail.equipment.name,
            model: detail.equipment.model,
            manufacturer: detail.equipment.manufacturer,
            category_id: detail.equipment.category_id != null ? String(detail.equipment.category_id) : "",
            description: detail.equipment.description,
            cover_image: detail.equipment.cover_image ?? "",
            tag_ids: detail.tags.map((t) => t.id),
          });
        } catch {
          setError("设备加载失败");
        }
      });
    }
  }, [equipmentId]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(id: number) {
    set("tag_ids", form.tag_ids.includes(id) ? form.tag_ids.filter((t) => t !== id) : [...form.tag_ids, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      model: form.model,
      manufacturer: form.manufacturer,
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description,
      cover_image: form.cover_image || null,
      tags: form.tag_ids,
    };

    try {
      if (equipmentId != null) {
        await adminRequest(`/api/admin/equipment/${equipmentId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest("/api/admin/equipment", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/admin/equipment");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
  const labelCls = "mb-1.5 block text-sm font-medium text-muted-foreground";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>设备名称 *</label>
          <input required className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>型号 *</label>
          <input required className={inputCls} value={form.model} onChange={(e) => set("model", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>厂家 *</label>
          <input required className={inputCls} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>分类</label>
          <select className={inputCls} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">未分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>封面图片 URL</label>
        <input
          className={inputCls}
          placeholder="https://…（可选）"
          value={form.cover_image}
          onChange={(e) => set("cover_image", e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>标签</label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                form.tag_ids.includes(tag.id)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/60",
              )}
            >
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && <span className="text-sm text-muted-foreground">暂无标签</span>}
        </div>
      </div>

      <div>
        <label className={labelCls}>设备描述</label>
        <textarea
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className={cn(buttonVariants(), submitting && "opacity-60")}>
          {submitting ? "保存中…" : equipmentId != null ? "保存修改" : "创建设备"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/equipment")}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          取消
        </button>
      </div>
    </form>
  );
}
