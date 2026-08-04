import type { Metadata } from "next";

import { AdminLayout } from "@/components/admin/AdminLayout";

export const metadata: Metadata = {
  title: "后台管理 - EquipmentWiki",
  robots: { index: false, follow: false },
};

/** 后台管理布局（独立于前台；登录页除外） */
export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
