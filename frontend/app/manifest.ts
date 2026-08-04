import type { MetadataRoute } from "next";

/** PWA manifest：移动端基础支持（暂不做离线缓存） */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EquipmentWiki 设备维修知识库",
    short_name: "设备知识库",
    description: "公开设备维修知识库：设备资料、说明书、故障解决方案、维修文章",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1e40af",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
