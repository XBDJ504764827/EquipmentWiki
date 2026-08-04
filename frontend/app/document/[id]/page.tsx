import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  documentDownloadUrl,
  fetchDocumentDetail,
  fetchDocuments,
  fetchEquipmentDetail,
} from "@/lib/api";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

/** 元数据：以资料标题作为页面标题 */
export async function generateMetadata({
  params,
}: DocumentPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const doc = await fetchDocumentDetail(id);
    return { title: `${doc.title} - EquipmentWiki`, description: doc.description };
  } catch {
    return { title: "资料详情 - EquipmentWiki" };
  }
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 文档详情页：
 * 标题 / 设备名 / 分类 / 版本 / 大小 / 更新时间 / 下载次数
 * → 在线查看器（PDF 用浏览器原生查看器，稳定无第三方依赖）
 * → 相关资料（同设备其他文档）
 */
export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  const document = await fetchDocumentDetail(id).catch(() => null);
  if (!document) notFound();

  // 并行获取所属设备信息 + 同设备文档（用于相关资料推荐）
  const [equipment, allDocs] = await Promise.all([
    fetchEquipmentDetail(document.equipment_id).catch(() => null),
    fetchDocuments(document.equipment_id).catch(() => null),
  ]);
  const related = (allDocs ?? []).filter((d) => d.id !== document.id);

  const isPdf = document.file_type === "pdf";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={equipment ? `/equipment/${equipment.equipment.id}` : "/equipment"}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        ← 返回{equipment ? ` ${equipment.equipment.name}` : "设备列表"}
      </Link>

      {/* ---- 文件信息 ---- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
            <Badge>{CATEGORY_LABELS[document.category] ?? document.category}</Badge>
            {document.is_primary && <Badge variant="secondary">主要文档</Badge>}
          </div>
          {document.description && (
            <p className="mt-2 text-sm text-muted-foreground">{document.description}</p>
          )}
          {/* 元信息 */}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <dt>设备：</dt>
              <dd>
                {equipment ? (
                  <Link href={`/equipment/${equipment.equipment.id}`} className="text-primary hover:underline">
                    {equipment.equipment.name}（{equipment.equipment.model}）
                  </Link>
                ) : (
                  `#${document.equipment_id}`
                )}
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>版本：</dt>
              <dd>{document.version}</dd>
            </div>
            <div className="flex gap-1">
              <dt>语言：</dt>
              <dd>{document.language === "zh" ? "中文" : document.language}</dd>
            </div>
            <div className="flex gap-1">
              <dt>大小：</dt>
              <dd>{formatSize(document.file_size)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>下载：</dt>
              <dd>{document.download_count} 次</dd>
            </div>
            <div className="flex gap-1">
              <dt>更新：</dt>
              <dd>{new Date(document.updated_at).toLocaleDateString("zh-CN")}</dd>
            </div>
          </dl>
        </div>

        {/* 下载按钮（走 /download 接口，计数+1 并返回附件） */}
        <a
          href={documentDownloadUrl(document.id)}
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          下载文件
        </a>
      </div>

      {/* ---- 在线查看器 ---- */}
      <div className="overflow-hidden rounded-lg border bg-white">
        {isPdf ? (
          // 浏览器原生 PDF 查看器：稳定、无需第三方组件
          <iframe
            src={document.file_url}
            title={document.title}
            className="h-[70vh] w-full"
          />
        ) : document.file_type === "mp4" || document.file_type === "webm" ? (
          // 视频说明书：HTML5 原生播放
          <div className="p-4">
            <VideoPlayer document={document} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-14 text-sm text-muted-foreground">
            <span>该类型（{document.file_type.toUpperCase()}）不支持在线预览</span>
            <a
              href={documentDownloadUrl(document.id)}
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              下载查看
            </a>
          </div>
        )}
      </div>

      {/* ---- 相关资料（同设备其他文档） ---- */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
            相关资料
          </h2>
          <ul className="divide-y rounded-md border">
            {related.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link
                  href={`/document/${doc.id}`}
                  className="min-w-0 truncate font-medium hover:text-primary"
                >
                  {doc.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {CATEGORY_LABELS[doc.category] ?? doc.category}
                  </Badge>
                  <Badge variant="secondary" className="uppercase">
                    {doc.file_type}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
