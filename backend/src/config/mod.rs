use std::env;

/// Application configuration loaded from environment variables (.env file).
#[derive(Debug, Clone)]
#[allow(dead_code)] // fields will be consumed by database/R2 modules in later stages
pub struct Config {
    /// Address the HTTP server binds to, e.g. "0.0.0.0:8080".
    pub server_addr: String,
    /// PostgreSQL connection string (sqlx).
    pub database_url: String,
    /// Cloudflare R2 S3-compatible endpoint.
    pub r2_endpoint: String,
    pub r2_access_key: String,
    pub r2_secret_key: String,
    pub r2_bucket: String,
    /// Local directory for uploaded files (dev/testing).
    pub storage_dir: String,
}

impl Config {
    /// Load configuration from environment variables.
    ///
    /// Reads the `.env` file at the project root (if present) via `dotenvy`,
    /// then pulls values from the process environment.
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        Ok(Self {
            server_addr: env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string()),
            database_url: env::var("DATABASE_URL")?,
            r2_endpoint: env::var("R2_ENDPOINT")?,
            r2_access_key: env::var("R2_ACCESS_KEY")?,
            r2_secret_key: env::var("R2_SECRET_KEY")?,
            r2_bucket: env::var("R2_BUCKET")?,
            storage_dir: env::var("STORAGE_DIR")
                .unwrap_or_else(|_| "./storage".to_string()),
        })
    }
}
