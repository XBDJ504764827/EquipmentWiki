"use client";

import Link from "next/link";
import { BookOpen, Boxes, FileText, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchArticles, fetchEquipmentList, fetchCategories, fetchTags } from "@/lib/api";

/** 统计卡片数据 */
async function loadStats() {
  const [equipment, categories, tags, articles] = await Promise.all([
    fetchEquipmentList(1, 1).catch(() => null),
    fetchCategories().catch(() => []),
    fetchTags().catch(() => []),
    fetchArticles({ page: 1, limit: 1 }).catch(() => null),
  ]);
  return {
    equipment: equipment?.total ?? 0,
    categories: categories.length,
    tags: tags.length,
    articles: articles?.total ?? 0,
  };
}

/**
 * 后台首页：内容统计概览 + 快捷入口。
 */
export default function AdminHomePage() {
  const [stats, setStats] = useState<{
    equipment: number;
    categories: number;
    tags: number;
    articles: number;
  } | null>(null);

  useEffect(() => {
    loadStats().then(setStats).catch(() => setStats(null));
  }, []);

  const items = [
    { label: "设备", value: stats?.equipment, href: "/admin/equipment", icon: Boxes },
    { label: "分类", value: stats?.categories, href: "/admin/categories", icon: Boxes },
    { label: "标签", value: stats?.tags, href: "/admin/tags", icon: Boxes },
    { label: "文章", value: stats?.articles, href: "/admin/articles", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">内容概览</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          管理设备、资料、文章、故障、分类与标签
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <Link key={item.label} href={item.href}>
            <Card className="transition-colors hover:border-primary/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="size-4" />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {stats == null ? "…" : (item.value ?? 0)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/equipment/create">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-3 py-4">
              <Boxes className="size-8 text-primary" />
              <div>
                <p className="font-medium">新增设备</p>
                <p className="text-sm text-muted-foreground">创建新的设备档案</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/documents">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="size-8 text-primary" />
              <div>
                <p className="font-medium">上传资料</p>
                <p className="text-sm text-muted-foreground">上传说明书、图片、视频等</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/articles">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-3 py-4">
              <BookOpen className="size-8 text-primary" />
              <div>
                <p className="font-medium">发布文章</p>
                <p className="text-sm text-muted-foreground">编写维修教程与操作指南</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/faults">
          <Card className="transition-colors hover:border-primary/60">
            <CardContent className="flex items-center gap-3 py-4">
              <TriangleAlert className="size-8 text-primary" />
              <div>
                <p className="font-medium">维护故障</p>
                <p className="text-sm text-muted-foreground">编辑常见故障与解决方案</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
