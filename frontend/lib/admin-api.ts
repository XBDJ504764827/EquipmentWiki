/**
 * 后台管理 API 客户端。
 *
 * 认证：所有管理接口需要 `Authorization: Bearer <ADMIN_TOKEN>`。
 * 令牌由 /admin/login 页输入后存入 localStorage；
 * 任一请求返回 401 时自动跳转登录页。
 */

import { API_URL } from "./api";

/** localStorage 键：后台访问令牌 */
export const ADMIN_TOKEN_KEY = "equipmentwiki_admin_token";

/** 读取本地保存的管理令牌 */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 保存管理令牌 */
export function setAdminToken(token: string) {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

/** 清除管理令牌（登出） */
export function clearAdminToken() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** 管理 API 统一错误 */
export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/** 管理 API 请求（JSON） */
export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    // 未授权 → 跳转登录
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new AdminApiError(401, "未授权，请重新登录");
  }

  const body = (await res.json().catch(() => null)) as
    | { data: T; message: string }
    | { error: string; message: string }
    | null;

  if (!res.ok || !body || !("data" in body)) {
    const err = body as { message?: string } | null;
    throw new AdminApiError(res.status, err?.message ?? `请求失败 (${res.status})`);
  }
  return body.data;
}

/** 管理文件上传（multipart），返回上传元数据 */
export async function adminUpload(file: File) {
  const token = getAdminToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/admin/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: "no-store",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new AdminApiError(401, "未授权，请重新登录");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data) {
    throw new AdminApiError(res.status, body?.message ?? "上传失败");
  }
  return body.data as {
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
    mime_type: string;
  };
}
