//! Tag REST API.
//!
//! Endpoints:
//!
//! - `GET /api/tags`             tag list (with equipment counts)
//! - `GET /api/tags/{id}/equipment`  equipment carrying a tag

use axum::{
    Json,
    extract::{Path, State},
};

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    equipment::EquipmentWithCategory,
    tag::{Tag, TagWithCount},
};
use crate::routes::AppState;

/// `GET /api/tags` — all tags, ordered by usage (most used first).
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<ApiOk<Vec<TagWithCount>>>> {
    let tags: Vec<TagWithCount> = sqlx::query_as::<_, TagWithCount>(
        "SELECT t.id, t.name, t.description, t.created_at, COUNT(et.equipment_id) AS equipment_count
         FROM tags t
         LEFT JOIN equipment_tags et ON et.tag_id = t.id
         GROUP BY t.id
         ORDER BY equipment_count DESC, t.id",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(tags)))
}

/// `GET /api/tags/{id}/equipment` — equipment carrying the tag.
pub async fn equipment_by_tag(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<EquipmentWithCategory>>>> {
    // 标签必须存在
    let tag: Option<Tag> = sqlx::query_as::<_, Tag>("SELECT * FROM tags WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if tag.is_none() {
        return Err(AppError::NotFound(format!("tag {id} not found")));
    }

    let items: Vec<EquipmentWithCategory> = sqlx::query_as::<_, EquipmentWithCategory>(
        "SELECT e.id, e.name, e.model, e.manufacturer, e.category_id, e.description,
                e.cover_image, e.created_at, e.updated_at,
                c.name AS category_name
         FROM equipment e
         LEFT JOIN equipment_categories c ON c.id = e.category_id
         JOIN equipment_tags et ON et.equipment_id = e.id
         WHERE et.tag_id = $1
         ORDER BY e.id DESC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(items)))
}
