//! Fault knowledge REST API.
//!
//! Endpoints:
//!
//! - `GET  /api/equipment/{id}/faults`   list faults of an equipment
//! - `POST /api/faults`                  create a fault (testing)

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    fault::{CreateFault, Fault},
};
use crate::routes::AppState;

/// `GET /api/equipment/{id}/faults` — all faults of an equipment.
pub async fn list_by_equipment(
    State(state): State<AppState>,
    Path(equipment_id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<Fault>>>> {
    let faults: Vec<Fault> = sqlx::query_as::<_, Fault>(
        "SELECT id, equipment_id, title, symptom, reason, solution, created_at
         FROM faults
         WHERE equipment_id = $1
         ORDER BY created_at DESC",
    )
    .bind(equipment_id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(faults)))
}

/// `POST /api/faults` — create a fault record (testing).
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateFault>,
) -> ApiResult<(StatusCode, Json<ApiOk<Fault>>)> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    // The equipment must exist.
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment WHERE id = $1)")
        .bind(payload.equipment_id)
        .fetch_one(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if !exists {
        return Err(AppError::NotFound(format!(
            "equipment {} not found",
            payload.equipment_id
        )));
    }

    let fault: Fault = sqlx::query_as::<_, Fault>(
        "INSERT INTO faults (equipment_id, title, symptom, reason, solution)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, equipment_id, title, symptom, reason, solution, created_at",
    )
    .bind(payload.equipment_id)
    .bind(payload.title.trim())
    .bind(payload.symptom.trim())
    .bind(payload.reason.trim())
    .bind(payload.solution.trim())
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(fault))))
}
