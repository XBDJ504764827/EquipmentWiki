mod config;
mod database;
mod models;
mod routes;
mod services;

use axum::serve;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    let config = config::Config::from_env().expect("failed to load configuration");

    let listener = TcpListener::bind(&config.server_addr)
        .await
        .expect("failed to bind server address");
    println!("EquipmentWiki API listening on {}", config.server_addr);

    serve(listener, routes::app())
        .await
        .expect("server error");
}
