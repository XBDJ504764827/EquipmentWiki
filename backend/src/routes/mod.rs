//! Route handlers.
//!
//! Business endpoints (equipment, manuals, images, repair knowledge,
//! troubleshooting) will be added in later stages.

pub mod health;

use axum::{routing::get, Router};

/// Build the full application router.
pub fn app() -> Router {
    Router::new().route("/", get(health::root))
}
