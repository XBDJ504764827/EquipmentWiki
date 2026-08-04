//! Search REST API.
//!
//! `GET /api/search?keyword=&category=&manufacturer=&type=`
//!
//! - `keyword`     搜索关键词，匹配设备名称/型号/厂家、资料标题/描述、
//!                 故障标题/现象/解决方案（ILIKE 模糊匹配）
//! - `category`    按设备分类过滤（如"金属加工"）
//! - `manufacturer` 按制造商过滤
//! - `type`        限定搜索范围：equipment | documents | faults（不传=全部）
//!
//! 返回：
//! ```json
//! { "data": { "equipment": [], "documents": [], "faults": [] }, "message": "success" }
//! ```

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use crate::models::{
    api::{ApiOk, ApiResult},
    equipment::Equipment,
    search::{DocumentHit, FaultHit, SearchResult},
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
    /// 搜索范围：equipment | documents | faults
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

/// `GET /api/search` — 全库搜索（设备/资料/故障）。
pub async fn search(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> ApiResult<Json<ApiOk<SearchResult>>> {
    let keyword = params.keyword.unwrap_or_default();
    let category = params.category.unwrap_or_default();
    let manufacturer = params.manufacturer.unwrap_or_default();
    let search_type = params.search_type.unwrap_or_default().to_lowercase();

    // 空关键词：不做搜索，返回空结构（前端可据此提示）。
    if keyword.trim().is_empty() {
        return Ok(Json(ApiOk::success(SearchResult {
            equipment: vec![],
            documents: vec![],
            faults: vec![],
        })));
    }

    let kw = escape_like(keyword.trim());
    let cat = category.trim().to_string();
    let mfr = manufacturer.trim().to_string();
    // 模糊模式：%kw%
    let pattern = format!("%{kw}%");

    // ---- 1. 设备搜索：名称/型号/厂家 ----
    let equipment: Vec<Equipment> = if want(&search_type, "equipment") {
        sqlx::query_as::<_, Equipment>(
            "SELECT id, name, model, manufacturer, category, description, cover_image, created_at, updated_at
             FROM equipment
             WHERE (name ILIKE $1 OR model ILIKE $1 OR manufacturer ILIKE $1)
               AND ($2 = '' OR category = $2)
               AND ($3 = '' OR manufacturer = $3)
             ORDER BY id DESC
             LIMIT $4",
        )
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(crate::models::api::AppError::Database)?
    } else {
        vec![]
    };

    // ---- 2. 资料搜索：标题/描述 ----
    let documents: Vec<DocumentHit> = if want(&search_type, "documents") {
        sqlx::query_as::<_, DocumentHit>(
            "SELECT d.id, d.equipment_id, d.title, d.description, d.file_url, d.file_type, d.category,
                    d.version, d.language, d.file_size, d.mime_type, d.download_count, d.is_primary,
                    d.created_at, d.updated_at, e.name AS equipment_name
             FROM documents d
             JOIN equipment e ON e.id = d.equipment_id
             WHERE (d.title ILIKE $1 OR d.description ILIKE $1)
               AND ($2 = '' OR e.category = $2)
               AND ($3 = '' OR e.manufacturer = $3)
             ORDER BY d.created_at DESC
             LIMIT $4",
        )
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(crate::models::api::AppError::Database)?
    } else {
        vec![]
    };

    // ---- 3. 故障搜索：标题/现象/解决方案 ----
    let faults: Vec<FaultHit> = if want(&search_type, "faults") {
        sqlx::query_as::<_, FaultHit>(
            "SELECT f.id, f.equipment_id, f.title, f.symptom, f.reason, f.solution, f.created_at,
                    e.name AS equipment_name
             FROM faults f
             JOIN equipment e ON e.id = f.equipment_id
             WHERE (f.title ILIKE $1 OR f.symptom ILIKE $1 OR f.solution ILIKE $1)
               AND ($2 = '' OR e.category = $2)
               AND ($3 = '' OR e.manufacturer = $3)
             ORDER BY f.created_at DESC
             LIMIT $4",
        )
        .bind(&pattern)
        .bind(&cat)
        .bind(&mfr)
        .bind(MAX_HITS)
        .fetch_all(&state.pool)
        .await
        .map_err(crate::models::api::AppError::Database)?
    } else {
        vec![]
    };

    Ok(Json(ApiOk::success(SearchResult {
        equipment,
        documents,
        faults,
    })))
}
