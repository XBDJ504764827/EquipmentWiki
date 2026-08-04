import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentList } from "@/components/DocumentList";
import { FaultList } from "@/components/FaultList";
import { FileCard } from "@/components/FileCard";
import { ImageGallery, type GalleryImage } from "@/components/ImageGallery";
import { MaintenanceList } from "@/components/MaintenanceList";
import { MediaGallery } from "@/components/MediaGallery";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ARTICLE_TYPE_LABELS,
  fetchDocuments,
  fetchEquipmentArticles,
  fetchEquipmentDetail,
  fetchEquipmentImages,
  fetchFaults,
  fetchMaintenance,
  type GalleryItem,
} from "@/lib/api";

interface EquipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

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

/**
 * 设备详情页。
 * 页面结构：设备信息 → 资料中心（📄文档/🖼图片/🎬视频/📦文件）
 *          → 故障知识 → 维护周期 → 维修文章。
 * 四类数据并行请求，任一失败不影响其余区块。
 */
export default async function EquipmentDetailPage({
  params,
}: EquipmentDetailPageProps) {
  const { id } = await params;

  const detail = await fetchEquipmentDetail(id).catch(() => null);
  if (!detail) notFound();
  const equipment = detail.equipment;

  const [documents, faults, maintenance, articles, equipmentImages] = await Promise.all([
    fetchDocuments(id).catch(() => null),
    fetchFaults(id).catch(() => null),
    fetchMaintenance(id).catch(() => null),
    fetchEquipmentArticles(id).catch(() => null),
    fetchEquipmentImages(id).catch(() => null),
  ]);

  const docs = documents ?? [];

  // 资料中心分组（按预览类型）
  const pdfDocs = docs.filter((d) => d.preview_type === "pdf");
  const videoDocs = docs.filter((d) => d.preview_type === "video");
  const fileDocs = docs.filter((d) => d.preview_type === "none");
  const imageDocs = docs.filter((d) => d.preview_type === "image");

  // 设备信息卡片内：封面大图（单图）
  const galleryImages: GalleryImage[] = equipment.cover_image
    ? [{ url: equipment.cover_image, alt: `${equipment.name} 设备图片` }]
    : [];

  // 资料中心图片区：封面 + 图片集合（document_images 聚合）
  const mediaGalleryImages: GalleryItem[] = [
    ...galleryImages,
    ...(equipmentImages ?? []).map((img) => ({
      url: img.image_url,
      alt: imageDocs.find((d) => d.id === img.document_id)?.title ?? `${equipment.name} 图片`,
    })),
  ];

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

      {/* ---- 资料中心（文档/图片/视频/文件） ---- */}
      <section className="mb-8">
        <SectionTitle>资料中心</SectionTitle>
        {pdfDocs.length === 0 &&
        videoDocs.length === 0 &&
        fileDocs.length === 0 &&
        mediaGalleryImages.length <= 1 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            暂无资料
          </p>
        ) : (
          <div className="space-y-6">
            {/* 📄 文档（PDF 说明书/维修手册/参数手册等） */}
            {pdfDocs.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  📄 文档<span className="text-xs font-normal">（{pdfDocs.length}）</span>
                </h3>
                <DocumentList documents={pdfDocs} />
              </div>
            )}

            {/* 🖼 图片（封面 + 图片集合） */}
            {mediaGalleryImages.length > 1 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  🖼 图片<span className="text-xs font-normal">（{mediaGalleryImages.length}）</span>
                </h3>
                <MediaGallery images={mediaGalleryImages} />
              </div>
            )}

            {/* 🎬 视频（调试/设置视频说明书） */}
            {videoDocs.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  🎬 视频<span className="text-xs font-normal">（{videoDocs.length}）</span>
                </h3>
                <div className="space-y-4">
                  {videoDocs.map((doc) => (
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
              </div>
            )}

            {/* 📦 文件（CAD/软件/压缩包等） */}
            {fileDocs.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  📦 文件<span className="text-xs font-normal">（{fileDocs.length}）</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {fileDocs.map((doc) => (
                    <FileCard key={doc.id} document={doc} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

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
