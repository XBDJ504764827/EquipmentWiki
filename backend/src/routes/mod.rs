//! Route handlers.
//!
//! Business endpoints: equipment, documents (files), faults, maintenance.

pub mod admin;
pub mod article;
pub mod categories;
pub mod documents;
pub mod equipment;
pub mod faults;
pub mod health;
pub mod maintenance;
pub mod search;
pub mod tags;

use std::sync::Arc;

use axum::{
    Router, middleware,
    routing::{get, post, put},
};
use sqlx::PgPool;

use crate::services::storage::Storage;

/// Shared application state injected into all handlers via `State`.
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool.
    pub pool: PgPool,
    /// File storage backend (local filesystem for now, R2 later).
    pub storage: Arc<dyn Storage>,
    /// 后台管理 API 访问令牌（None = 管理 API 全部拒绝）。
    pub admin_token: Option<String>,
}

/// Build the full application router.
pub fn app(state: AppState) -> Router {
    // ---- 管理 API（Bearer token 认证） ----
    let admin_routes = Router::new()
        .route("/api/admin/verify", get(admin::verify))
        .route("/api/admin/upload", post(admin::upload))
        .route("/api/admin/equipment", post(admin::create_equipment))
        .route(
            "/api/admin/equipment/{id}",
            put(admin::update_equipment).delete(admin::delete_equipment),
        )
        .route("/api/admin/documents", post(admin::create_document))
        .route(
            "/api/admin/documents/{id}",
            put(admin::update_document).delete(admin::delete_document),
        )
        .route("/api/admin/articles", post(admin::create_article))
        .route(
            "/api/admin/articles/{id}",
            put(admin::update_article).delete(admin::delete_article),
        )
        .route("/api/admin/faults", post(admin::create_fault))
        .route(
            "/api/admin/faults/{id}",
            put(admin::update_fault).delete(admin::delete_fault),
        )
        .route("/api/admin/categories", post(admin::create_category))
        .route(
            "/api/admin/categories/{id}",
            put(admin::update_category).delete(admin::delete_category),
        )
        .route("/api/admin/tags", post(admin::create_tag))
        .route(
            "/api/admin/tags/{id}",
            put(admin::update_tag).delete(admin::delete_tag),
        )
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            admin::require_admin,
        ));

    Router::new()
        .merge(admin_routes)
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
        .route(
            "/api/equipment/{id}/images",
            get(documents::images_by_equipment),
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
        // ---- articles ----
        .route("/api/articles", get(article::list).post(article::create))
        .route("/api/articles/{id_or_slug}", get(article::detail))
        .route(
            "/api/equipment/{id}/articles",
            get(article::list_by_equipment),
        )
        // ---- search ----
        .route("/api/search", get(search::search))
        // ---- maintenance ----
        .route(
            "/api/equipment/{id}/maintenance",
            get(maintenance::list_by_equipment),
        )
        .with_state(state)
}
