"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export interface GalleryImage {
  url: string;
  alt: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  /** 主图高度（px） */
  height?: number;
}

/**
 * 图片资料查看组件：
 * - 大图展示（默认第一张）
 * - 缩略图行，点击切换
 * - 点击大图进入全屏放大（遮罩），支持左右切换与 Esc/点击关闭
 *
 * 适用于设备照片、接线图、电路图等图片类资料。
 */
export function ImageGallery({ images, height = 360 }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const active = images[activeIndex] ?? null;

  // 全屏模式下左右切换 / Esc 关闭
  const step = useCallback(
    (delta: number) => {
      setActiveIndex((i) => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, step]);

  if (images.length === 0) return null;

  return (
    <div>
      {/* 大图 */}
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        className="relative block w-full overflow-hidden rounded-lg border bg-muted/40"
        style={{ height }}
        aria-label="点击放大图片"
      >
        {active && (
          <Image
            src={active.url}
            alt={active.alt}
            fill
            unoptimized
            className="object-contain"
          />
        )}
      </button>

      {/* 缩略图行 */}
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded border transition-colors ${
                i === activeIndex
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/60"
              }`}
              aria-label={`查看图片 ${img.alt}`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* 全屏放大遮罩 */}
      {fullscreen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* 关闭 */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            onClick={() => setFullscreen(false)}
          >
            关闭 (Esc)
          </button>

          {/* 上一张 */}
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

          {/* 大图 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 下一张 */}
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

          {/* 指示器 */}
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {activeIndex + 1} / {images.length} · {active.alt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
