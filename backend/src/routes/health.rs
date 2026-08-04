//! Root health check endpoint.

use axum::Json;
use serde_json::{Value, json};

/// `GET /` — basic service status.
pub async fn root() -> Json<Value> {
    Json(json!({
        "name": "EquipmentWiki API",
        "status": "running"
    }))
}
