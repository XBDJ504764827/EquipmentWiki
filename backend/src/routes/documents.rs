//! Document REST API.
//!
//! Endpoints:
//!
//! - `GET  /api/equipment/{id}/documents`   list documents of an equipment
//! - `GET  /api/documents/{id}`             document detail
//! - `GET  /api/documents/{id}/download`    download file, increments counter
//! - `POST /api/documents`                  upload a document (multipart, testing)
//!
//! Uploaded files are stored through the [`Storage`] abstraction
//! (local filesystem for now) and served at `/files/...`.

use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    document::Document,
};
use crate::routes::AppState;
use crate::services::storage::{document_key, file_type_of};

/// `GET /api/equipment/{id}/documents` — all documents of an equipment.
pub async fn list_by_equipment(
    State(state): State<AppState>,
    Path(equipment_id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<Document>>>> {
    let documents: Vec<Document> = sqlx::query_as::<_, Document>(
        "SELECT id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                created_at, updated_at
         FROM documents
         WHERE equipment_id = $1
         ORDER BY is_primary DESC, created_at DESC",
    )
    .bind(equipment_id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(documents)))
}

/// `GET /api/documents/{id}` — document detail.
pub async fn detail(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<Document>>> {
    let document: Option<Document> = sqlx::query_as::<_, Document>(
        "SELECT id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                created_at, updated_at
         FROM documents
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match document {
        Some(document) => Ok(Json(ApiOk::success(document))),
        None => Err(AppError::NotFound(format!("document {id} not found"))),
    }
}

/// `GET /api/documents/{id}/download` — download a document file.
///
/// 原子地使 `download_count` +1，然后以附件方式返回文件字节
/// （`Content-Disposition: attachment`，浏览器直接下载）。
pub async fn download(State(state): State<AppState>, Path(id): Path<i64>) -> ApiResult<Response> {
    // 1. 读取文档记录
    let document: Option<Document> = sqlx::query_as::<_, Document>(
        "SELECT id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                created_at, updated_at
         FROM documents
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    let document =
        document.ok_or_else(|| AppError::NotFound(format!("document {id} not found")))?;

    // 2. 下载计数 +1
    sqlx::query("UPDATE documents SET download_count = download_count + 1 WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;

    // 3. 通过存储抽象读取文件内容
    let key = document
        .file_url
        .strip_prefix("/files/")
        .unwrap_or(&document.file_url);
    let bytes = state
        .storage
        .read_file(key)
        .map_err(|e| AppError::Storage(e.0))?;

    // 4. 以附件响应返回（文件名安全化，避免 header 注入）
    let file_name = document.title.replace(['\r', '\n', '"'], "_");
    let content_type = if document.mime_type.is_empty() {
        "application/octet-stream"
    } else {
        &document.mime_type
    };

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content_type.to_string()),
            (
                header::CONTENT_DISPOSITION,
                format!(
                    "attachment; filename=\"{file_name}.{}\"",
                    document.file_type
                ),
            ),
            (header::CONTENT_LENGTH, bytes.len().to_string()),
        ],
        bytes,
    )
        .into_response())
}

/// `POST /api/documents` — upload a document file (multipart form).
///
/// Fields:
/// - `equipment_id` (text, required)
/// - `title`        (text, required)
/// - `description`  (text, optional)
/// - `category`     (text, optional, manual/repair/electrical/parameter/software/other)
/// - `version`      (text, optional, default "1.0")
/// - `language`     (text, optional, default "zh")
/// - `file`         (file, required)
pub async fn upload(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<ApiOk<Document>>)> {
    let mut equipment_id: Option<i64> = None;
    let mut title: Option<String> = None;
    let mut description = String::new();
    let mut category = String::from("other");
    let mut version = String::from("1.0");
    let mut language = String::from("zh");
    let mut file_name: Option<String> = None;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_mime = String::new();

    // Parse multipart fields (order is not guaranteed).
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("invalid multipart data: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "equipment_id" => {
                let text = field.text().await.unwrap_or_default();
                equipment_id = text.trim().parse().ok();
            }
            "title" => title = Some(field.text().await.unwrap_or_default()),
            "description" => description = field.text().await.unwrap_or_default(),
            "category" => category = field.text().await.unwrap_or_default(),
            "version" => version = field.text().await.unwrap_or_default(),
            "language" => language = field.text().await.unwrap_or_default(),
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                file_mime = field.content_type().unwrap_or("").to_string();
                file_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| AppError::BadRequest(format!("failed to read file: {e}")))?
                        .to_vec(),
                );
            }
            _ => {}
        }
    }

    // Validation.
    let equipment_id =
        equipment_id.ok_or_else(|| AppError::BadRequest("equipment_id is required".to_string()))?;
    let title = title
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| AppError::BadRequest("title is required".to_string()))?;
    let file_name =
        file_name.ok_or_else(|| AppError::BadRequest("file is required".to_string()))?;
    let file_bytes =
        file_bytes.ok_or_else(|| AppError::BadRequest("file is required".to_string()))?;
    if file_bytes.is_empty() {
        return Err(AppError::BadRequest("file is empty".to_string()));
    }

    // The equipment must exist.
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment WHERE id = $1)")
        .bind(equipment_id)
        .fetch_one(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if !exists {
        return Err(AppError::NotFound(format!(
            "equipment {equipment_id} not found"
        )));
    }

    // Store the file through the storage abstraction.
    let key = document_key(equipment_id, &file_name);
    let file_url = state
        .storage
        .upload_file(&key, &file_bytes)
        .map_err(|e| AppError::Storage(e.0))?;
    let file_type = file_type_of(&file_mime, &file_name);

    let document: Document = sqlx::query_as::<_, Document>(
        "INSERT INTO documents
            (equipment_id, title, description, file_url, file_type, category, version, language, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                created_at, updated_at",
    )
    .bind(equipment_id)
    .bind(title.trim())
    .bind(description.trim())
    .bind(&file_url)
    .bind(&file_type)
    .bind(category.trim())
    .bind(version.trim())
    .bind(language.trim())
    .bind(file_bytes.len() as i64)
    .bind(&file_mime)
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(document))))
}
