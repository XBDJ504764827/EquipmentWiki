//! Maintenance knowledge REST API.
//!
//! Endpoints:
//!
//! - `GET /api/equipment/{id}/maintenance`   list maintenance items of an equipment

use axum::{
    Json,
    extract::{Path, State},
};

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    maintenance::Maintenance,
};
use crate::routes::AppState;

/// `GET /api/equipment/{id}/maintenance` — all maintenance items.
pub async fn list_by_equipment(
    State(state): State<AppState>,
    Path(equipment_id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<Maintenance>>>> {
    let items: Vec<Maintenance> = sqlx::query_as::<_, Maintenance>(
        "SELECT id, equipment_id, title, content, cycle, created_at
         FROM maintenance
         WHERE equipment_id = $1
         ORDER BY created_at DESC",
    )
    .bind(equipment_id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(items)))
}
