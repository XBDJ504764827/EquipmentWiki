//! Search REST API.
//!
//! `GET /api/search?keyword=&category=&manufacturer=&tag=&type=`
//!
//! - `keyword`     搜索关键词：ILIKE 模糊匹配（中英文均可）
//!   + PostgreSQL 全文搜索（search_vector tsvector + GIN，适配英文/型号）
//! - `category`    按设备分类过滤（含子分类）
//! - `manufacturer` 按制造商过滤
//! - `tag`         按标签过滤（设备标签）
//! - `type`        限定搜索范围：equipment | documents | faults | articles
//!
//! 返回（相关度排序 + 高亮片段）：
//! ```json
//! { "data": { "equipment": [], "documents": [], "faults": [], "articles": [] }, "message": "success" }
//! ```

use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    search::{ArticleHit, DocumentHit, EquipmentHit, FaultHit, SearchResult, first_snippet},
};
use crate::routes::AppState;

/// 每个类别的最大返回条数（防止超大结果集）。
const MAX_HITS: i64 = 20;

/// Query parameters for the search endpoint.
#[derive(Debug, Default, Deserialize)]
pub struct SearchParams {
    /// 搜索关键词（可为空，空则返回空结果）
    pub keyword: Option<String>,
    /// 设备分类过滤
    pub category: Option<String>,
    /// 制造商过滤
    pub manufacturer: Option<String>,
    /// 标签过滤
    pub tag: Option<String>,
    /// 搜索范围：equipment | documents | faults | articles
    #[serde(rename = "type")]
    pub search_type: Option<String>,
}

/// 转义 LIKE 通配符，使关键词按字面匹配。
fn escape_like(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

/// 是否搜索指定类别。
fn want(search_type: &str, category: &str) -> bool {
    search_type.is_empty() || search_type == category
}

/// 中文/常见关键词 → 资料分类映射。
/// 例如搜"电路图"返回 electrical/cad 类资料，搜"视频"返回视频类资料。
fn category_keyword_mapping(kw: &str) -> Option<&'static str> {
    match kw {
        "说明书" | "手册" | "使用说明" => Some("manual"),
        "维修" | "修理" => Some("repair"),
        "图纸" | "电路图" | "接线图" | "结构图" => Some("electrical"),
        "cad" | "CAD" | "dwg" => Some("cad"),
        "参数" => Some("parameter"),
        "软件" | "程序" => Some("software"),
        "视频" | "录像" => Some("video"),
        "图片" | "照片" | "外观" => Some("image"),
        "压缩" | "打包" | "zip" => Some("archive"),
        _ => None,
    }
}

/// 构造 PostgreSQL 全文查询串（websearch 语法）：
/// 保留字母数字与空白，其余字符置为空格，按空白切词后用 `|`（OR）连接。
/// 空串返回空串（websearch_to_tsquery('') 安全，不报错）。
fn build_fts_query(keyword: &str) -> String {
    keyword
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" | ")
}

/// `GET /api/search` — 全库全文搜索（设备/资料/故障/文章）。
pub async fn search(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<ApiOk<SearchResult>>> {
    let keyword = params.keyword.unwrap_or_default();
    let category = params.category.unwrap_or_default();
    let manufacturer = params.manufacturer.unwrap_or_default();
    let tag = params.tag.unwrap_or_default();
    let search_type = params.search_type.unwrap_or_default().to_lowercase();

    // 空关键词：不做搜索，返回空结构（前端可据此提示）。
    if keyword.trim().is_empty() {
        return Ok(Json(ApiOk::success(SearchResult {
            equipment: vec![],
            documents: vec![],
            faults: vec![],
            articles: vec![],
        })));
    }

    let kw = escape_like(keyword.trim());
    let cat = category.trim().to_string();
    let mfr = manufacturer.trim().to_string();
    let tag_filter = tag.trim().to_string();
    // 模糊模式：%kw%
    let pattern = format!("%{kw}%");
    // 全文查询串
    let fts_query = build_fts_query(keyword.trim());

    // 中文关键词 → 分类映射（如"电路图"→ electrical）
    let mapped_category = category_keyword_mapping(keyword.trim());
    // 视频类前缀匹配（video_debug / video_setup）
    let mapped_prefix = mapped_category
        .filter(|c| *c == "video")
        .map(|_| "video%".to_string());

    // ---- 1. 设备搜索（相关度：精确 > 名称/型号 > 厂家） ----
    let mut equipment: Vec<EquipmentHit> = if want(&search_type, "equipment") {
        sqlx::query_as::<_, EquipmentHit>(
            "SELECT e.id, e.name, e.model, e.manufacturer, e.category_id, e.description,
                    e.cover_image, e.created_at, e.updated_at, c.name AS category_name
             FROM equipment e
             LEFT JOIN equipment_categories c ON c.id = e.category_id
             WHERE (e.name ILIKE $2 OR e.model ILIKE $2 OR e.manufacturer ILIKE $2
                    OR ($6 != '' AND e.search_vector @@ websearch_to_tsquery('simple', $6))
                    OR e.category_id IN (SELECT id FROM equipment_categories WHERE name ILIKE $2)
                    OR e.id IN (SELECT et.equipment_id FROM equipment_tags et
                                JOIN tags t ON t.id = et.tag_id WHERE t.name ILIKE $2))
               AND ($3 = '' OR EXISTS (
                    WITH RECURSIVE ancestors AS (
                        SELECT id, name, parent_id FROM equipment_categories WHERE id = e.category_id
                        UNION ALL
                        SELECT c.id, c.name, c.parent_id
                        FROM equipment_categories c JOIN ancestors a ON c.id = a.parent_id
                    )
                    SELECT 1 FROM ancestors WHERE name = $3
               ))
               AND ($4 = '' OR e.manufacturer = $4)
               AND ($5 = '' OR e.id IN (SELECT et.equipment_id FROM equipment_tags et
                                        JOIN tags t ON t.id = et.tag_id WHERE t.name = $5))
             ORDER BY (
                 CASE
                     WHEN lower(e.name) = lower($1) OR lower(e.model) = lower($1) THEN 100
                     WHEN e.name ILIKE $2 OR e.model ILIKE $2 THEN 60
                     WHEN e.manufacturer ILIKE $2 THEN 40
                     ELSE 10
                 END
             ) DESC, e.id DESC
             LIMIT $7",
        )
        .bind(keyword.trim())
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(&tag_filter)
        .bind(&fts_query)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?
    } else {
        vec![]
    };
    for hit in &mut equipment {
        hit.snippet = first_snippet(
            keyword.trim(),
            &[
                &hit.equipment.name,
                &hit.equipment.model,
                &hit.equipment.manufacturer,
            ],
        );
    }

    // ---- 2. 资料搜索（相关度：精确标题 > 标题 > 内容） ----
    let mut documents: Vec<DocumentHit> = if want(&search_type, "documents") {
        sqlx::query_as::<_, DocumentHit>(
            "SELECT d.id, d.equipment_id, d.title, d.description, d.file_url, d.file_type, d.category,
                    d.version, d.language, d.file_size, d.mime_type, d.download_count, d.is_primary,
                    d.storage_type, d.file_extension, d.preview_type, d.download_enabled,
                    d.thumbnail_url, d.created_at, d.updated_at, e.name AS equipment_name
             FROM documents d
             JOIN equipment e ON e.id = d.equipment_id
             LEFT JOIN equipment_categories c ON c.id = e.category_id
             WHERE (d.title ILIKE $2 OR d.description ILIKE $2
                    OR d.file_type ILIKE $2 OR d.category ILIKE $2
                    OR ($6 != '' AND d.search_vector @@ websearch_to_tsquery('simple', $6))
                    OR ($8 != '' AND d.category = $8)
                    OR ($8 != '' AND d.category LIKE $9))
               AND ($3 = '' OR EXISTS (
                    WITH RECURSIVE ancestors AS (
                        SELECT id, name, parent_id FROM equipment_categories WHERE id = e.category_id
                        UNION ALL
                        SELECT c.id, c.name, c.parent_id
                        FROM equipment_categories c JOIN ancestors a ON c.id = a.parent_id
                    )
                    SELECT 1 FROM ancestors WHERE name = $3
               ))
               AND ($4 = '' OR e.manufacturer = $4)
               AND ($5 = '' OR e.id IN (SELECT et.equipment_id FROM equipment_tags et
                                        JOIN tags t ON t.id = et.tag_id WHERE t.name = $5))
             ORDER BY (
                 CASE
                     WHEN lower(d.title) = lower($1) THEN 100
                     WHEN d.title ILIKE $2 THEN 60
                     ELSE 20
                 END
             ) DESC, d.created_at DESC
             LIMIT $7",
        )
        .bind(keyword.trim())
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(&tag_filter)
        .bind(&fts_query)
        .bind(MAX_HITS)
        .bind(mapped_category.unwrap_or(""))
        .bind(mapped_prefix.as_deref().unwrap_or(""))
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?
    } else {
        vec![]
    };
    for hit in &mut documents {
        hit.snippet = first_snippet(
            keyword.trim(),
            &[&hit.document.title, &hit.document.description],
        );
    }

    // ---- 3. 故障搜索（相关度：精确标题 > 标题 > 内容） ----
    let mut faults: Vec<FaultHit> = if want(&search_type, "faults") {
        sqlx::query_as::<_, FaultHit>(
            "SELECT f.id, f.equipment_id, f.title, f.symptom, f.reason, f.solution, f.created_at,
                    e.name AS equipment_name
             FROM faults f
             JOIN equipment e ON e.id = f.equipment_id
             LEFT JOIN equipment_categories c ON c.id = e.category_id
             WHERE (f.title ILIKE $2 OR f.symptom ILIKE $2 OR f.solution ILIKE $2
                    OR ($6 != '' AND f.search_vector @@ websearch_to_tsquery('simple', $6)))
               AND ($3 = '' OR EXISTS (
                    WITH RECURSIVE ancestors AS (
                        SELECT id, name, parent_id FROM equipment_categories WHERE id = e.category_id
                        UNION ALL
                        SELECT c.id, c.name, c.parent_id
                        FROM equipment_categories c JOIN ancestors a ON c.id = a.parent_id
                    )
                    SELECT 1 FROM ancestors WHERE name = $3
               ))
               AND ($4 = '' OR e.manufacturer = $4)
               AND ($5 = '' OR e.id IN (SELECT et.equipment_id FROM equipment_tags et
                                        JOIN tags t ON t.id = et.tag_id WHERE t.name = $5))
             ORDER BY (
                 CASE
                     WHEN lower(f.title) = lower($1) THEN 100
                     WHEN f.title ILIKE $2 THEN 60
                     ELSE 20
                 END
             ) DESC, f.created_at DESC
             LIMIT $7",
        )
        .bind(keyword.trim())
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(&tag_filter)
        .bind(&fts_query)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?
    } else {
        vec![]
    };
    for hit in &mut faults {
        hit.snippet = first_snippet(
            keyword.trim(),
            &[
                &hit.fault.title,
                &hit.fault.symptom,
                &hit.fault.reason,
                &hit.fault.solution,
            ],
        );
    }

    // ---- 4. 文章搜索（相关度：精确标题 > 标题 > 内容） ----
    let mut articles: Vec<ArticleHit> = if want(&search_type, "articles") {
        sqlx::query_as::<_, ArticleHit>(
            "SELECT a.id, a.equipment_id, a.title, a.slug, a.summary, a.content,
                    a.cover_image, a.type AS article_type, a.created_at, a.updated_at,
                    e.name AS equipment_name
             FROM articles a
             LEFT JOIN equipment e ON e.id = a.equipment_id
             WHERE (a.title ILIKE $2 OR a.summary ILIKE $2 OR a.content ILIKE $2
                    OR ($6 != '' AND a.search_vector @@ websearch_to_tsquery('simple', $6)))
               AND ($3 = '' OR EXISTS (
                    WITH RECURSIVE ancestors AS (
                        SELECT id, name, parent_id FROM equipment_categories WHERE id = e.category_id
                        UNION ALL
                        SELECT c.id, c.name, c.parent_id
                        FROM equipment_categories c JOIN ancestors a2 ON c.id = a2.parent_id
                    )
                    SELECT 1 FROM ancestors WHERE name = $3
               ))
               AND ($4 = '' OR e.manufacturer = $4)
               AND ($5 = '' OR e.id IN (SELECT et.equipment_id FROM equipment_tags et
                                        JOIN tags t ON t.id = et.tag_id WHERE t.name = $5))
             ORDER BY (
                 CASE
                     WHEN lower(a.title) = lower($1) THEN 100
                     WHEN a.title ILIKE $2 THEN 60
                     ELSE 20
                 END
             ) DESC, a.created_at DESC
             LIMIT $7",
        )
        .bind(keyword.trim())
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(&tag_filter)
        .bind(&fts_query)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?
    } else {
        vec![]
    };
    for hit in &mut articles {
        hit.snippet = first_snippet(
            keyword.trim(),
            &[
                &hit.article.title,
                &hit.article.summary,
                &hit.article.content,
            ],
        );
    }

    Ok(Json(ApiOk::success(SearchResult {
        equipment,
        documents,
        faults,
        articles,
    })))
}
