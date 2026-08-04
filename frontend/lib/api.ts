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

/** 设备（与 backend/src/models/equipment.rs 对应） */
export interface Equipment {
  id: number;
  /** 设备名称 */
  name: string;
  /** 设备型号 */
  model: string;
  /** 制造商 */
  manufacturer: string;
  /** 设备分类 */
  category: string;
  /** 设备描述 */
  description: string;
  /** 封面图片地址（可为空） */
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

/** 分页列表结果 */
export interface EquipmentListResult {
  items: Equipment[];
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
  | "other";

/** 资料分类的中文标签（展示用） */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  manual: "说明书",
  repair: "维修手册",
  electrical: "电气图纸",
  parameter: "参数手册",
  software: "软件资料",
  other: "其他资料",
};

/** 资料分类展示顺序（详情页分区用） */
export const CATEGORY_ORDER: DocumentCategory[] = [
  "manual",
  "repair",
  "electrical",
  "parameter",
  "software",
  "other",
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
  equipment: Equipment[];
  documents: DocumentHit[];
  faults: FaultHit[];
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
 * 获取设备列表（分页）。
 * @param page 页码，从 1 开始
 * @param limit 每页数量，默认 12
 */
export function fetchEquipmentList(page = 1, limit = 12): Promise<EquipmentListResult> {
  return request<EquipmentListResult>(`/api/equipment?page=${page}&limit=${limit}`);
}

/** 获取设备详情 */
export function fetchEquipmentDetail(id: number | string): Promise<Equipment> {
  return request<Equipment>(`/api/equipment/${id}`);
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
