//! Root health check endpoint.

use axum::Json;
use serde_json::{json, Value};

/// `GET /` — basic service status.
pub async fn root() -> Json<Value> {
    Json(json!({
        "name": "EquipmentWiki API",
        "status": "running"
    }))
}
