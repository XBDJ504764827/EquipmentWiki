//! Equipment REST API.
//!
//! Endpoints (all under `/api/equipment`):
//!
//! - `GET  /api/equipment`        list with pagination (`page`, `limit`)
//! - `GET  /api/equipment/{id}`   equipment detail
//! - `POST /api/equipment`        create equipment (temporary, for testing)

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    equipment::{CreateEquipment, Equipment, EquipmentList},
};
use crate::routes::AppState;

/// Query parameters for the equipment list endpoint.
#[derive(Debug, Deserialize)]
pub struct ListParams {
    /// Page number, 1-based. Default: 1
    pub page: Option<i64>,
    /// Items per page. Default: 20, max: 100
    pub limit: Option<i64>,
}

/// `GET /api/equipment` — paginated equipment list.
pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> ApiResult<Json<ApiOk<EquipmentList>>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    // Total record count (for pagination UI).
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM equipment")
        .fetch_one(&state.pool)
        .await
        .map_err(AppError::Database)?;

    let items: Vec<Equipment> = sqlx::query_as::<_, Equipment>(
        "SELECT id, name, model, manufacturer, category, description, cover_image, created_at, updated_at
         FROM equipment
         ORDER BY id DESC
         LIMIT $1 OFFSET $2",
    )
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
pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<Equipment>>> {
    let equipment: Option<Equipment> = sqlx::query_as::<_, Equipment>(
        "SELECT id, name, model, manufacturer, category, description, cover_image, created_at, updated_at
         FROM equipment
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match equipment {
        Some(equipment) => Ok(Json(ApiOk::success(equipment))),
        None => Err(AppError::NotFound(format!("equipment {id} not found"))),
    }
}

/// `POST /api/equipment` — create a new equipment record (testing stage).
///
/// Returns the created record with `201 Created`.
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateEquipment>,
) -> ApiResult<(StatusCode, Json<ApiOk<Equipment>>)> {
    // Basic validation: name/model/manufacturer/category are required.
    if payload.name.trim().is_empty()
        || payload.model.trim().is_empty()
        || payload.manufacturer.trim().is_empty()
        || payload.category.trim().is_empty()
    {
        return Err(AppError::BadRequest(
            "name, model, manufacturer and category are required".to_string(),
        ));
    }

    let equipment: Equipment = sqlx::query_as::<_, Equipment>(
        "INSERT INTO equipment (name, model, manufacturer, category, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, model, manufacturer, category, description, cover_image, created_at, updated_at",
    )
    .bind(payload.name.trim())
    .bind(payload.model.trim())
    .bind(payload.manufacturer.trim())
    .bind(payload.category.trim())
    .bind(payload.description.trim())
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(equipment))))
}
