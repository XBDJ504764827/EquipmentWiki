import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentList } from "@/components/DocumentList";
import { FaultList } from "@/components/FaultList";
import { ImageGallery, type GalleryImage } from "@/components/ImageGallery";
import { MaintenanceList } from "@/components/MaintenanceList";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ARTICLE_TYPE_LABELS,
  CATEGORY_LABELS,
  type Document,
  type DocumentCategory,
  fetchDocuments,
  fetchEquipmentArticles,
  fetchEquipmentDetail,
  fetchFaults,
  fetchMaintenance,
} from "@/lib/api";

interface EquipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

const IMAGE_FILE_TYPES = new Set(["png", "jpg", "jpeg", "webp"]);

/** 详情页元数据：以设备名称作为页面标题 */
export async function generateMetadata({
  params,
}: EquipmentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = await fetchEquipmentDetail(id);
    return {
      title: `${detail.equipment.name} (${detail.equipment.model}) - EquipmentWiki`,
      description: detail.equipment.description,
    };
  } catch {
    return { title: "设备详情 - EquipmentWiki" };
  }
}

/** 详情区块的统一标题 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-semibold">
      {children}
    </h2>
  );
}

/** 按分类取文档子集 */
function byCategory(documents: Document[], category: DocumentCategory): Document[] {
  return documents.filter((d) => d.category === category);
}

/**
 * 设备详情页。
 * 页面结构：设备信息 → 设备图片 → 说明书 → 维修资料 → 相关资料
 *          → 故障知识 → 维护周期。
 * 四类数据并行请求，任一失败不影响其余区块。
 */
export default async function EquipmentDetailPage({
  params,
}: EquipmentDetailPageProps) {
  const { id } = await params;

  const detail = await fetchEquipmentDetail(id).catch(() => null);
  if (!detail) notFound();
  const equipment = detail.equipment;

  const [documents, faults, maintenance, articles] = await Promise.all([
    fetchDocuments(id).catch(() => null),
    fetchFaults(id).catch(() => null),
    fetchMaintenance(id).catch(() => null),
    fetchEquipmentArticles(id).catch(() => null),
  ]);

  const docs = documents ?? [];
  // 图片区：设备封面 + 图片类资料（设备照片/接线图/电路图）
  const galleryImages: GalleryImage[] = [
    ...(equipment.cover_image
      ? [{ url: equipment.cover_image, alt: `${equipment.name} 设备图片` }]
      : []),
    ...docs
      .filter((d) => IMAGE_FILE_TYPES.has(d.file_type))
      .map((d) => ({ url: d.file_url, alt: d.title })),
  ];

  // 分区：说明书 / 维修资料 / 相关资料（其余类别汇总）
  const manualDocs = byCategory(docs, "manual");
  const repairDocs = byCategory(docs, "repair");
  const relatedDocs = docs.filter(
    (d) =>
      d.category !== "manual" &&
      d.category !== "repair" &&
      d.category !== "video_debug" &&
      d.category !== "video_setup",
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* 返回列表 */}
      <Link
        href="/equipment"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
      >
        ← 返回设备列表
      </Link>

      {/* ---- 设备信息 ---- */}
      <Card className="mb-8">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">{equipment.name}</CardTitle>
            {detail.category_name && <Badge>{detail.category_name}</Badge>}
          </div>
          {/* 分类路径面包屑 */}
          {detail.category_path.length > 0 && (
            <nav aria-label="分类路径" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {detail.category_path.map((item, i) => (
                <span key={item.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground/60">&gt;</span>}
                  <Link
                    href={`/categories/${item.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          {/* 标签 */}
          {detail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">ID：{equipment.id}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ---- 设备图片（封面 + 图片资料，可点击放大） ---- */}
          {galleryImages.length > 0 && (
            <ImageGallery images={galleryImages} height={360} />
          )}

          {/* 基本信息表 */}
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">设备型号</dt>
              <dd className="mt-0.5 font-medium">{equipment.model || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">制造商</dt>
              <dd className="mt-0.5 font-medium">{equipment.manufacturer || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">设备分类</dt>
              <dd className="mt-0.5 font-medium">{detail.category_name || "未分类"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">更新时间</dt>
              <dd className="mt-0.5 font-medium">
                {new Date(equipment.updated_at).toLocaleString("zh-CN")}
              </dd>
            </div>
          </dl>

          {/* 描述 */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">设备描述</h2>
            <p className="whitespace-pre-line leading-relaxed">
              {equipment.description || "暂无描述"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---- 说明书 ---- */}
      {manualDocs.length > 0 && (
        <section className="mb-8">
          <SectionTitle>说明书</SectionTitle>
          <DocumentList documents={manualDocs} />
        </section>
      )}

      {/* ---- 维修资料 ---- */}
      {repairDocs.length > 0 && (
        <section className="mb-8">
          <SectionTitle>维修资料</SectionTitle>
          <DocumentList documents={repairDocs} />
        </section>
      )}

      {/* ---- 调试视频 ---- */}
      {byCategory(docs, "video_debug").length > 0 && (
        <section className="mb-8">
          <SectionTitle>调试视频</SectionTitle>
          <div className="space-y-4">
            {byCategory(docs, "video_debug").map((doc) => (
              <div key={doc.id} className="rounded-md border p-3">
                <Link
                  href={`/document/${doc.id}`}
                  className="font-medium hover:text-primary"
                >
                  {doc.title}
                </Link>
                <VideoPlayer document={doc} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- 设置视频 ---- */}
      {byCategory(docs, "video_setup").length > 0 && (
        <section className="mb-8">
          <SectionTitle>设置视频</SectionTitle>
          <div className="space-y-4">
            {byCategory(docs, "video_setup").map((doc) => (
              <div key={doc.id} className="rounded-md border p-3">
                <Link
                  href={`/document/${doc.id}`}
                  className="font-medium hover:text-primary"
                >
                  {doc.title}
                </Link>
                <VideoPlayer document={doc} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- 相关资料（电气图纸/参数手册/软件资料/其他） ---- */}
      {relatedDocs.length > 0 && (
        <section className="mb-8">
          <SectionTitle>相关资料</SectionTitle>
          <DocumentList documents={relatedDocs} />
          <p className="mt-2 text-xs text-muted-foreground">
            分类：
            {[...new Set(relatedDocs.map((d) => CATEGORY_LABELS[d.category]))].join(" · ")}
          </p>
        </section>
      )}

      {/* ---- 故障知识 ---- */}
      <section className="mb-8">
        <SectionTitle>常见故障</SectionTitle>
        {faults ? (
          <FaultList faults={faults} />
        ) : (
          <p className="rounded-md border border-destructive/40 py-6 text-center text-sm text-destructive">
            故障信息加载失败
          </p>
        )}
      </section>

      {/* ---- 维护周期 ---- */}
      <section className="mb-8">
        <SectionTitle>维护周期</SectionTitle>
        {maintenance ? (
          <MaintenanceList items={maintenance} />
        ) : (
          <p className="rounded-md border border-destructive/40 py-6 text-center text-sm text-destructive">
            维护信息加载失败
          </p>
        )}
      </section>

      {/* ---- 维修文章（相关维修教程/操作指南/经验文章） ---- */}
      <section className="mb-8">
        <SectionTitle>维修文章</SectionTitle>
        {articles === null ? (
          <p className="rounded-md border border-destructive/40 py-6 text-center text-sm text-destructive">
            文章加载失败
          </p>
        ) : articles.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            暂无相关文章
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {articles.map(({ article }) => (
              <li key={article.id} className="px-4 py-3">
                <Link
                  href={`/articles/${article.slug}`}
                  className="flex items-center justify-between gap-3 hover:text-primary"
                >
                  <span className="min-w-0 truncate font-medium">{article.title}</span>
                  <Badge variant="outline" className="shrink-0">
                    {ARTICLE_TYPE_LABELS[article.article_type] ?? article.article_type}
                  </Badge>
                </Link>
                {article.summary && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {article.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
