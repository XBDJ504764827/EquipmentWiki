//! Category REST API.
//!
//! Endpoints:
//!
//! - `GET /api/categories`               category tree (nested children)
//! - `GET /api/categories/{id}/equipment`  equipment under a category (including all descendants)

use axum::{
    Json,
    extract::{Path, State},
};

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    category::{Category, CategoryNode},
    equipment::EquipmentWithCategory,
};
use crate::routes::AppState;

/// `GET /api/categories` — full category tree.
pub async fn tree(State(state): State<AppState>) -> ApiResult<Json<ApiOk<Vec<CategoryNode>>>> {
    let rows: Vec<Category> =
        sqlx::query_as::<_, Category>("SELECT * FROM equipment_categories ORDER BY id")
            .fetch_all(&state.pool)
            .await
            .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(CategoryNode::build_tree(&rows))))
}

/// `GET /api/categories/{id}/equipment` — equipment in a category.
///
/// 使用递归 CTE 包含所有子分类下的设备（无限级）。
pub async fn equipment_by_category(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<EquipmentWithCategory>>>> {
    // 分类必须存在
    let category: Option<Category> =
        sqlx::query_as::<_, Category>("SELECT * FROM equipment_categories WHERE id = $1")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .map_err(AppError::Database)?;
    if category.is_none() {
        return Err(AppError::NotFound(format!("category {id} not found")));
    }

    // 递归收集该分类及其所有后代分类下的设备
    let items: Vec<EquipmentWithCategory> = sqlx::query_as::<_, EquipmentWithCategory>(
        "WITH RECURSIVE descendants AS (
             SELECT id FROM equipment_categories WHERE id = $1
             UNION ALL
             SELECT c.id FROM equipment_categories c
             JOIN descendants d ON c.parent_id = d.id
         )
         SELECT e.id, e.name, e.model, e.manufacturer, e.category_id, e.description,
                e.cover_image, e.created_at, e.updated_at,
                c.name AS category_name
         FROM equipment e
         LEFT JOIN equipment_categories c ON c.id = e.category_id
         WHERE e.category_id IN (SELECT id FROM descendants)
         ORDER BY e.id DESC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(items)))
}
