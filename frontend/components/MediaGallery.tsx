"use client";

import { useState } from "react";

interface MediaGalleryImage {
  url: string;
  alt: string;
}

interface MediaGalleryProps {
  images: MediaGalleryImage[];
}

/**
 * 图片集合展示（媒体画廊）：
 * 缩略图网格 → 点击全屏放大（遮罩 + 左右切换 + Esc 关闭）。
 * 适用于设备照片、接线图、电路图、结构图等多图场景。
 */
export function MediaGallery({ images }: MediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  // 打开全屏时重置缩放
  const openAt = (i: number) => {
    setZoom(1);
    setActiveIndex(i);
  };

  if (images.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        暂无图片资料
      </p>
    );
  }

  const step = (delta: number) => {
    if (activeIndex == null) return;
    setActiveIndex((i) => (i! + delta + images.length) % images.length);
  };

  return (
    <div>
      {/* 缩略图网格 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => openAt(i)}
            className="group relative aspect-square overflow-hidden rounded-md border bg-muted/40 transition-colors hover:border-primary"
            aria-label={`查看图片 ${img.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* 全屏放大 */}
      {activeIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            onClick={() => setActiveIndex(null)}
          >
            关闭 (Esc)
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
            >
              ←
            </button>
          )}

          {/* 缩放控制（移动端：查看接线图/电路图细节） */}
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1">
            <button
              type="button"
              className="px-2 text-lg text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.max(1, z - 0.5));
              }}
            >
              −
            </button>
            <span className="w-10 text-center text-xs text-white/80">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="px-2 text-lg text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => Math.min(3, z + 0.5));
              }}
            >
              +
            </button>
          </div>

          {/* 大图（缩放后支持触摸平移） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeIndex].url}
            alt={images[activeIndex].alt}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-full max-w-full touch-pan-x touch-pan-y object-contain transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
            >
              →
            </button>
          )}

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
            {activeIndex + 1} / {images.length} · {images[activeIndex].alt}
          </p>
        </div>
      )}
    </div>
  );
}
