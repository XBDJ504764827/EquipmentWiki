//! Route handlers.
//!
//! Business endpoints: equipment, documents (files), faults, maintenance.

pub mod categories;
pub mod documents;
pub mod equipment;
pub mod faults;
pub mod health;
pub mod maintenance;
pub mod search;
pub mod tags;

use std::sync::Arc;

use axum::{Router, routing::get};
use sqlx::PgPool;

use crate::services::storage::Storage;

/// Shared application state injected into all handlers via `State`.
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool.
    pub pool: PgPool,
    /// File storage backend (local filesystem for now, R2 later).
    pub storage: Arc<dyn Storage>,
}

/// Build the full application router.
pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/", get(health::root))
        // ---- equipment ----
        .route(
            "/api/equipment",
            get(equipment::list).post(equipment::create),
        )
        .route("/api/equipment/{id}", get(equipment::detail))
        // ---- documents ----
        .route(
            "/api/equipment/{id}/documents",
            get(documents::list_by_equipment),
        )
        .route("/api/documents/{id}", get(documents::detail))
        .route("/api/documents/{id}/download", get(documents::download))
        .route("/api/documents", axum::routing::post(documents::upload))
        // ---- faults ----
        .route("/api/equipment/{id}/faults", get(faults::list_by_equipment))
        .route("/api/faults", axum::routing::post(faults::create))
        // ---- categories ----
        .route("/api/categories", get(categories::tree))
        .route(
            "/api/categories/{id}/equipment",
            get(categories::equipment_by_category),
        )
        // ---- tags ----
        .route("/api/tags", get(tags::list))
        .route("/api/tags/{id}/equipment", get(tags::equipment_by_tag))
        // ---- search ----
        .route("/api/search", get(search::search))
        // ---- maintenance ----
        .route(
            "/api/equipment/{id}/maintenance",
            get(maintenance::list_by_equipment),
        )
        .with_state(state)
}
