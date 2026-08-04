//! Database module.
//!
//! Owns the SQLx connection pool and runs SQL migrations
//! (files in `database/migrations/` at the repository root).

use sqlx::postgres::{PgPool, PgPoolOptions};

use crate::config::Config;

/// Path to the migration files, relative to the crate manifest dir
/// (`backend/`), i.e. the repo-root `database/migrations/` directory.
const MIGRATIONS_DIR: &str =
    concat!(env!("CARGO_MANIFEST_DIR"), "/../database/migrations");

/// Create a PostgreSQL connection pool from the application config.
pub async fn connect(config: &Config) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
}

/// Apply pending SQL migrations to the database.
pub async fn migrate(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate::Migrator::new(std::path::Path::new(MIGRATIONS_DIR))
        .await?
        .run(pool)
        .await
}
