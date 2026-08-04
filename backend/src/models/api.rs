//! Unified API response envelope and error handling.
//!
//! Success shape:
//! ```json
//! { "data": {}, "message": "success" }
//! ```
//!
//! Failure shape:
//! ```json
//! { "error": "not_found", "message": "equipment 1 not found" }
//! ```

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

/// Unified success envelope.
#[derive(Debug, Clone, Serialize)]
pub struct ApiOk<T: Serialize> {
    pub data: T,
    pub message: String,
}

impl<T: Serialize> ApiOk<T> {
    pub fn success(data: T) -> Self {
        Self {
            data,
            message: "success".to_string(),
        }
    }
}

/// Unified failure envelope.
#[derive(Debug, Clone, Serialize)]
pub struct ApiErr {
    /// Machine-readable error identifier (e.g. "not_found", "bad_request").
    pub error: String,
    /// Human-readable error description.
    pub message: String,
}

/// Application error type, convertible into a unified JSON response.
#[derive(Debug)]
pub enum AppError {
    /// 400 — invalid request (query params, body, multipart, ...)
    BadRequest(String),
    /// 403 — forbidden (e.g. download disabled)
    Forbidden(String),
    /// 404 — resource not found
    NotFound(String),
    /// 500 — database failure
    Database(sqlx::Error),
    /// 500 — file storage failure
    Storage(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request".to_string(), msg),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "forbidden".to_string(), msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "not_found".to_string(), msg),
            AppError::Database(err) => {
                eprintln!("[error] database: {err}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "database_error".to_string(),
                    "internal server error".to_string(),
                )
            }
            AppError::Storage(msg) => {
                eprintln!("[error] storage: {msg}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "storage_error".to_string(),
                    "internal server error".to_string(),
                )
            }
        };

        (status, Json(ApiErr { error, message })).into_response()
    }
}

/// Convenience alias so handlers can return `Result<T, AppError>`.
pub type ApiResult<T> = Result<T, AppError>;
