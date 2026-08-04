/**
 * API 客户端 — 统一管理后端请求。
 *
 * 后端地址通过 `NEXT_PUBLIC_API_URL` 环境变量配置（见根目录 .env.example），
 * 默认指向本地开发服务。
 *
 * 后端统一返回格式：
 * 成功 { data, message: "success" }
 * 失败 { error, message }
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** 成功响应包装 */
export interface ApiOk<T> {
  data: T;
  message: string;
}

/** 失败响应包装 */
export interface ApiErr {
  error: string;
  message: string;
}

/** 设备基础信息（与 backend/src/models/equipment.rs 对应） */
export interface Equipment {
  id: number;
  /** 设备名称 */
  name: string;
  /** 设备型号 */
  model: string;
  /** 制造商 */
  manufacturer: string;
  /** 所属分类 ID（null = 未分类） */
  category_id: number | null;
  /** 设备描述 */
  description: string;
  /** 封面图片地址（可为空） */
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

/** 设备 + 分类名（列表/搜索返回） */
export interface EquipmentWithCategory {
  equipment: Equipment;
  /** 所属分类名称 */
  category_name: string | null;
}

/** 分类路径节点（根 → 叶） */
export interface CategoryPathItem {
  id: number;
  name: string;
}

/** 设备详情（含分类路径 + 标签） */
export interface EquipmentDetail {
  equipment: Equipment;
  category_name: string | null;
  category_path: CategoryPathItem[];
  tags: Tag[];
}

/** 分类节点（树结构） */
export interface CategoryNode {
  id: number;
  name: string;
  description: string;
  children: CategoryNode[];
}

/** 标签（含设备数量） */
export interface Tag {
  id: number;
  name: string;
  description: string;
  created_at: string;
  equipment_count?: number;
}

/** 分页列表结果 */
export interface EquipmentListResult {
  items: EquipmentWithCategory[];
  page: number;
  limit: number;
  total: number;
}

/** 设备资料分类 */
export type DocumentCategory =
  | "manual"
  | "repair"
  | "electrical"
  | "parameter"
  | "software"
  | "other"
  | "video_debug"
  | "video_setup";

/** 资料分类的中文标签（展示用） */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  manual: "说明书",
  repair: "维修手册",
  electrical: "电气图纸",
  parameter: "参数手册",
  software: "软件资料",
  other: "其他资料",
  video_debug: "调试视频",
  video_setup: "设置视频",
};

/** 资料分类展示顺序（详情页分区用） */
export const CATEGORY_ORDER: DocumentCategory[] = [
  "manual",
  "repair",
  "electrical",
  "parameter",
  "software",
  "other",
  "video_debug",
  "video_setup",
];

/** 设备资料（与 backend/src/models/document.rs 对应） */
export interface Document {
  id: number;
  equipment_id: number;
  title: string;
  description: string;
  file_url: string;
  /** pdf / png / jpg / webp / doc / xls ... */
  file_type: string;
  /** 资料分类：manual / repair / electrical / parameter / software / other */
  category: DocumentCategory;
  /** 文档版本 */
  version: string;
  /** 文档语言 */
  language: string;
  /** 文件大小（字节） */
  file_size: number;
  /** MIME 类型 */
  mime_type: string;
  /** 累计下载次数 */
  download_count: number;
  /** 是否为主要文档 */
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/** 故障知识（与 backend/src/models/fault.rs 对应） */
export interface Fault {
  id: number;
  equipment_id: number;
  title: string;
  symptom: string;
  reason: string;
  solution: string;
  created_at: string;
}

/** 维护知识（与 backend/src/models/maintenance.rs 对应） */
export interface Maintenance {
  id: number;
  equipment_id: number;
  title: string;
  content: string;
  cycle: string;
  created_at: string;
}

/** 搜索命中的资料（文档 + 所属设备名） */
export interface DocumentHit {
  document: Document;
  equipment_name: string;
}

/** 搜索命中的故障（故障 + 所属设备名） */
export interface FaultHit {
  fault: Fault;
  equipment_name: string;
}

/** 搜索结果（与 backend/src/models/search.rs 对应） */
export interface SearchResult {
  equipment: EquipmentWithCategory[];
  documents: DocumentHit[];
  faults: FaultHit[];
  articles: ArticleWithEquipment[];
}

/** 搜索参数 */
export interface SearchParams {
  keyword?: string;
  /** 设备分类过滤 */
  category?: string;
  /** 制造商过滤 */
  manufacturer?: string;
  /** 搜索范围：equipment | documents | faults */
  type?: string;
}

/** 请求失败时抛出的统一错误 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // 公开知识库数据实时展示，不做缓存
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "无法连接后端服务，请确认 API 已启动");
  }

  const body = (await res.json().catch(() => null)) as
    | ApiOk<T>
    | ApiErr
    | null;

  if (!res.ok || !body || !("data" in body)) {
    const errBody = body as ApiErr | null;
    throw new ApiError(res.status, errBody?.message ?? `请求失败 (${res.status})`);
  }
  return body.data;
}

/**
 * 获取设备列表（分页 + 分类筛选）。
 * @param page 页码，从 1 开始
 * @param limit 每页数量，默认 12
 * @param categoryId 分类筛选（含子分类），不传为全部
 */
export function fetchEquipmentList(
  page = 1,
  limit = 12,
  categoryId?: number | string,
): Promise<EquipmentListResult> {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categoryId != null) qs.set("category_id", String(categoryId));
  return request<EquipmentListResult>(`/api/equipment?${qs.toString()}`);
}

/** 获取设备详情（含分类路径 + 标签） */
export function fetchEquipmentDetail(id: number | string): Promise<EquipmentDetail> {
  return request<EquipmentDetail>(`/api/equipment/${id}`);
}

/** 获取设备资料列表 */
export function fetchDocuments(equipmentId: number | string): Promise<Document[]> {
  return request<Document[]>(`/api/equipment/${equipmentId}/documents`);
}

/** 获取单个资料详情 */
export function fetchDocumentDetail(id: number | string): Promise<Document> {
  return request<Document>(`/api/documents/${id}`);
}

/** 资料下载地址（GET 触发后端计数 +1 并以附件返回） */
export function documentDownloadUrl(id: number | string): string {
  return `${API_URL}/api/documents/${id}/download`;
}

/** 获取设备故障列表 */
export function fetchFaults(equipmentId: number | string): Promise<Fault[]> {
  return request<Fault[]>(`/api/equipment/${equipmentId}/faults`);
}

/** 获取设备维护说明列表 */
export function fetchMaintenance(equipmentId: number | string): Promise<Maintenance[]> {
  return request<Maintenance[]>(`/api/equipment/${equipmentId}/maintenance`);
}

/**
 * 全库搜索（设备/资料/故障）。
 * 仅当提供 keyword 时才发起请求。
 */
export function fetchSearch(params: SearchParams): Promise<SearchResult> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.category) qs.set("category", params.category);
  if (params.manufacturer) qs.set("manufacturer", params.manufacturer);
  if (params.type) qs.set("type", params.type);
  return request<SearchResult>(`/api/search?${qs.toString()}`);
}

/** 获取分类树 */
export function fetchCategories(): Promise<CategoryNode[]> {
  return request<CategoryNode[]>("/api/categories");
}

/** 获取分类下设备（含子分类） */
export function fetchCategoryEquipment(categoryId: number | string): Promise<EquipmentWithCategory[]> {
  return request<EquipmentWithCategory[]>(`/api/categories/${categoryId}/equipment`);
}

/** 获取标签列表（含设备数量） */
export function fetchTags(): Promise<Tag[]> {
  return request<Tag[]>("/api/tags");
}

/** 获取标签下设备 */
export function fetchTagEquipment(tagId: number | string): Promise<EquipmentWithCategory[]> {
  return request<EquipmentWithCategory[]>(`/api/tags/${tagId}/equipment`);
}

/** 文章类型 */
export type ArticleType = "repair" | "guide" | "maintenance" | "experience" | "other";

/** 文章类型中文标签 */
export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  repair: "维修教程",
  guide: "操作指南",
  maintenance: "维护教程",
  experience: "维修经验",
  other: "其他",
};

/** 维修知识文章（与 backend/src/models/article.rs 对应） */
export interface Article {
  id: number;
  equipment_id: number | null;
  title: string;
  /** URL 路径（SEO） */
  slug: string;
  summary: string;
  /** Markdown 正文 */
  content: string;
  cover_image: string | null;
  article_type: ArticleType;
  created_at: string;
  updated_at: string;
}

/** 文章 + 关联设备名 */
export interface ArticleWithEquipment {
  article: Article;
  equipment_name: string | null;
}

/** 文章分页列表 */
export interface ArticleListResult {
  items: ArticleWithEquipment[];
  page: number;
  limit: number;
  total: number;
}

/** 获取文章列表（page/limit/type/equipment_id 筛选） */
export function fetchArticles(params?: {
  page?: number;
  limit?: number;
  type?: string;
  equipment_id?: number | string;
}): Promise<ArticleListResult> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.type) qs.set("type", params.type);
  if (params?.equipment_id != null) qs.set("equipment_id", String(params.equipment_id));
  return request<ArticleListResult>(`/api/articles${qs.toString() ? `?${qs.toString()}` : ""}`);
}

/** 获取文章详情（支持 id 或 slug） */
export function fetchArticleDetail(idOrSlug: number | string): Promise<ArticleWithEquipment> {
  return request<ArticleWithEquipment>(`/api/articles/${idOrSlug}`);
}

/** 获取设备相关文章 */
export function fetchEquipmentArticles(equipmentId: number | string): Promise<ArticleWithEquipment[]> {
  return request<ArticleWithEquipment[]>(`/api/equipment/${equipmentId}/articles`);
}
