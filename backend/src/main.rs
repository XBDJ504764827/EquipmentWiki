mod config;
mod database;
mod models;
mod routes;
mod services;

use std::sync::Arc;

use axum::http::{Method, header};
use axum::serve;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use services::storage::LocalStorage;

#[tokio::main]
async fn main() {
    let config = config::Config::from_env().expect("failed to load configuration");

    // Connect to PostgreSQL and apply pending migrations.
    let pool = database::connect(&config)
        .await
        .expect("failed to connect to database");
    database::migrate(&pool)
        .await
        .expect("failed to run database migrations");

    // Local file storage for uploaded documents (dev/testing).
    // Later stages can swap in a Cloudflare R2 backend via the Storage trait.
    let storage_dir = config.storage_dir;
    let storage =
        Arc::new(LocalStorage::new(&storage_dir, "/files").expect("failed to init local storage"));

    let listener = TcpListener::bind(&config.server_addr)
        .await
        .expect("failed to bind server address");
    println!("EquipmentWiki API listening on {}", config.server_addr);
    println!("Local storage: {storage_dir}");

    // CORS：公开知识库，允许所有来源；管理 API 需要 Authorization/Content-Type 头
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]);

    let app = routes::app(routes::AppState {
        pool,
        storage,
        admin_token: config.admin_token.clone(),
    })
    .layer(cors)
    // Serve uploaded files at /files/...
    .nest_service("/files", ServeDir::new(storage_dir));

    serve(listener, app).await.expect("server error");
}
