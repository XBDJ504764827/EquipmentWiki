//! Equipment REST API.
//!
//! Endpoints (all under `/api/equipment`):
//!
//! - `GET  /api/equipment`        list with pagination (`page`, `limit`)
//! - `GET  /api/equipment/{id}`   equipment detail (category path + tags)
//! - `POST /api/equipment`        create equipment (temporary, for testing)
//!   Body: { name, model, manufacturer, category_id?, description, tags?[] }

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde::Deserialize;

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    category::CategoryPathItem,
    equipment::{
        CreateEquipment, Equipment, EquipmentDetail, EquipmentList, EquipmentWithCategory,
    },
    tag::Tag,
};
use crate::routes::AppState;

/// Query parameters for the equipment list endpoint.
#[derive(Debug, Deserialize)]
pub struct ListParams {
    /// Page number, 1-based. Default: 1
    pub page: Option<i64>,
    /// Items per page. Default: 20, max: 100
    pub limit: Option<i64>,
    /// 按分类筛选（递归包含所有子分类下的设备）
    pub category_id: Option<i64>,
}

/// `GET /api/equipment` — paginated equipment list (with category name).
pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> ApiResult<Json<ApiOk<EquipmentList>>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    // 分类筛选：递归 CTE 收集该分类及其所有子分类，$1 为 NULL 时不过滤
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM equipment e
         WHERE ($1::bigint IS NULL OR e.category_id IN (
             WITH RECURSIVE descendants AS (
                 SELECT id FROM equipment_categories WHERE id = $1
                 UNION ALL
                 SELECT c.id FROM equipment_categories c
                 JOIN descendants d ON c.parent_id = d.id
             )
             SELECT id FROM descendants
         ))",
    )
    .bind(params.category_id)
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    let items: Vec<EquipmentWithCategory> = sqlx::query_as::<_, EquipmentWithCategory>(
        "SELECT e.id, e.name, e.model, e.manufacturer, e.category_id, e.description, \
                e.cover_image, e.created_at, e.updated_at, c.name AS category_name
         FROM equipment e
         LEFT JOIN equipment_categories c ON c.id = e.category_id
         WHERE ($1::bigint IS NULL OR e.category_id IN (
             WITH RECURSIVE descendants AS (
                 SELECT id FROM equipment_categories WHERE id = $1
                 UNION ALL
                 SELECT c.id FROM equipment_categories c
                 JOIN descendants d ON c.parent_id = d.id
             )
             SELECT id FROM descendants
         ))
         ORDER BY e.id DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(params.category_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(EquipmentList {
        items,
        page,
        limit,
        total,
    })))
}

/// `GET /api/equipment/{id}` — full equipment detail.
///
/// 返回基础信息 + 分类名称 + 分类路径（根→叶，面包屑用）+ 标签列表。
pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<EquipmentDetail>>> {
    // 1. 基础行 + 分类名
    let row: Option<EquipmentWithCategory> = sqlx::query_as::<_, EquipmentWithCategory>(
        "SELECT e.id, e.name, e.model, e.manufacturer, e.category_id, e.description, \
                e.cover_image, e.created_at, e.updated_at, c.name AS category_name
         FROM equipment e
         LEFT JOIN equipment_categories c ON c.id = e.category_id
         WHERE e.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    let row = row.ok_or_else(|| AppError::NotFound(format!("equipment {id} not found")))?;

    // 2. 分类路径：递归向上找父分类，depth 越大越靠近根
    let category_path: Vec<CategoryPathItem> = match row.equipment.category_id {
        Some(category_id) => sqlx::query_as::<_, CategoryPathItem>(
            "WITH RECURSIVE ancestors AS (
                     SELECT id, name, parent_id, 0 AS depth
                     FROM equipment_categories WHERE id = $1
                     UNION ALL
                     SELECT c.id, c.name, c.parent_id, a.depth + 1
                     FROM equipment_categories c
                     JOIN ancestors a ON c.id = a.parent_id
                 )
                 SELECT id, name FROM ancestors ORDER BY depth DESC",
        )
        .bind(category_id)
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?,
        None => vec![],
    };

    // 3. 标签
    let tags: Vec<Tag> = sqlx::query_as::<_, Tag>(
        "SELECT t.id, t.name, t.description, t.created_at
         FROM tags t
         JOIN equipment_tags et ON et.tag_id = t.id
         WHERE et.equipment_id = $1
         ORDER BY t.id",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(EquipmentDetail {
        equipment: row.equipment,
        category_name: row.category_name,
        category_path,
        tags,
    })))
}

/// `POST /api/equipment` — create a new equipment record (testing stage).
///
/// 支持 `category_id`（可选）与 `tags`（标签 ID 列表，可选）。
/// 设备与标签关联在同一事务中写入。
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateEquipment>,
) -> ApiResult<(StatusCode, Json<ApiOk<Equipment>>)> {
    // Basic validation: name/model/manufacturer are required.
    if payload.name.trim().is_empty()
        || payload.model.trim().is_empty()
        || payload.manufacturer.trim().is_empty()
    {
        return Err(AppError::BadRequest(
            "name, model and manufacturer are required".to_string(),
        ));
    }

    // 分类存在性校验（提供时）
    if let Some(category_id) = payload.category_id {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment_categories WHERE id = $1)")
                .bind(category_id)
                .fetch_one(&state.pool)
                .await
                .map_err(AppError::Database)?;
        if !exists {
            return Err(AppError::BadRequest(format!(
                "category {category_id} does not exist"
            )));
        }
    }

    // 标签存在性校验（提供时）
    if !payload.tags.is_empty() {
        let found: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tags WHERE id = ANY($1)")
            .bind(&payload.tags)
            .fetch_one(&state.pool)
            .await
            .map_err(AppError::Database)?;
        if found != payload.tags.len() as i64 {
            return Err(AppError::BadRequest(
                "one or more tags do not exist".to_string(),
            ));
        }
    }

    // 事务：插入设备 + 写入标签关联
    let mut tx = state.pool.begin().await.map_err(AppError::Database)?;

    let equipment: Equipment = sqlx::query_as::<_, Equipment>(
        "INSERT INTO equipment (name, model, manufacturer, category_id, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, model, manufacturer, category_id, description, cover_image, created_at, updated_at",
    )
    .bind(payload.name.trim())
    .bind(payload.model.trim())
    .bind(payload.manufacturer.trim())
    .bind(payload.category_id)
    .bind(payload.description.trim())
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    for tag_id in &payload.tags {
        sqlx::query("INSERT INTO equipment_tags (equipment_id, tag_id) VALUES ($1, $2)")
            .bind(equipment.id)
            .bind(tag_id)
            .execute(&mut *tx)
            .await
            .map_err(AppError::Database)?;
    }

    tx.commit().await.map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(equipment))))
}
