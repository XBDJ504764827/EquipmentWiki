//! Admin REST API — 内容管理后台。
//!
//! 认证：所有 `/api/admin/*` 路由要求 `Authorization: Bearer <ADMIN_TOKEN>`。
//! 第一阶段简单令牌保护；未来可替换为 JWT 管理员账号（预留扩展点）。
//!
//! 覆盖：设备 / 资料 / 文章 / 故障 / 分类 / 标签 的增删改，以及文件上传。

use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::{Request, StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::{IntoResponse, Response},
};

use axum::body::Body;

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    article::{Article, slugify},
    category::Category,
    document::{Document, preview_type_of},
    equipment::Equipment,
    fault::Fault,
    tag::Tag,
};
use crate::routes::AppState;
use crate::services::storage::file_type_of;

// ---------------------------------------------------------------------------
// 认证中间件
// ---------------------------------------------------------------------------

/// 管理 API 认证中间件：校验 `Authorization: Bearer <token>`。
///
/// 若 `ADMIN_TOKEN` 未配置，所有管理请求一律拒绝（401），保证安全默认。
pub async fn require_admin(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let expected = state.admin_token.clone().unwrap_or_default();
    if expected.is_empty() {
        return Json(crate::models::api::ApiErr {
            error: "unauthorized".to_string(),
            message: "admin token not configured".to_string(),
        })
        .into_response()
        .with_status(StatusCode::UNAUTHORIZED);
    }

    let auth = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");

    if auth == expected {
        next.run(req).await
    } else {
        Json(crate::models::api::ApiErr {
            error: "unauthorized".to_string(),
            message: "invalid or missing admin token".to_string(),
        })
        .into_response()
        .with_status(StatusCode::UNAUTHORIZED)
    }
}

/// 为统一错误响应附加 HTTP 状态码的辅助 trait。
trait WithStatus {
    fn with_status(self, status: StatusCode) -> Response;
}
impl WithStatus for Response {
    fn with_status(self, status: StatusCode) -> Response {
        let mut resp = self;
        *resp.status_mut() = status;
        resp
    }
}

/// `GET /api/admin/verify` — 令牌有效性验证（登录页探测用）。
pub async fn verify(State(state): State<AppState>) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let _ = state;
    Ok(Json(ApiOk::success(serde_json::json!({ "ok": true }))))
}

// ---------------------------------------------------------------------------
// 文件上传
// ---------------------------------------------------------------------------

/// 允许上传的扩展名白名单。
const ALLOWED_EXTENSIONS: &[&str] = &[
    "pdf", "jpg", "jpeg", "png", "webp", "zip", "dwg", "mp4", "webm", "doc", "docx", "xls", "xlsx",
];

/// 上传大小上限（100 MB）。
const MAX_UPLOAD_BYTES: usize = 100 * 1024 * 1024;

/// `POST /api/admin/upload` — 上传文件（multipart），返回保存后的元数据。
///
/// 流程：前端上传 → 保存到存储 → 返回 URL → 前端再调 POST /api/admin/documents 保存数据库。
pub async fn upload(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let mut file_name: Option<String> = None;
    let mut file_mime = String::new();
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("invalid multipart: {e}")))?
    {
        if field.name() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            file_mime = field.content_type().unwrap_or("").to_string();
            file_bytes = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| AppError::BadRequest(format!("read file failed: {e}")))?
                    .to_vec(),
            );
        }
    }

    let file_name =
        file_name.ok_or_else(|| AppError::BadRequest("file is required".to_string()))?;
    let file_bytes =
        file_bytes.ok_or_else(|| AppError::BadRequest("file is required".to_string()))?;

    // 大小限制
    if file_bytes.len() > MAX_UPLOAD_BYTES {
        return Err(AppError::BadRequest(format!(
            "file too large (max {} MB)",
            MAX_UPLOAD_BYTES / 1024 / 1024
        )));
    }

    // 类型白名单（按扩展名）
    let ext = file_name
        .rsplit('.')
        .next()
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::BadRequest(format!(
            "file type not allowed: .{ext}"
        )));
    }

    // 保存文件（equipment 前缀未知，用通用 uploads 目录；文档创建时记录实际 URL）
    let key = format!(
        "uploads/{}-{}",
        chrono::Utc::now().timestamp(),
        crate::services::storage::sanitize_file_name(&file_name)
    );
    let file_url = state
        .storage
        .upload_file(&key, &file_bytes)
        .map_err(|e| AppError::Storage(e.0))?;

    let file_type = file_type_of(&file_mime, &file_name);

    Ok(Json(ApiOk::success(serde_json::json!({
        "file_url": file_url,
        "file_name": file_name,
        "file_type": file_type,
        "file_size": file_bytes.len(),
        "mime_type": file_mime,
    }))))
}

// ---------------------------------------------------------------------------
// 设备管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct EquipmentPayload {
    pub name: String,
    pub model: String,
    pub manufacturer: String,
    pub category_id: Option<i64>,
    pub description: String,
    pub cover_image: Option<String>,
    #[serde(default)]
    pub tags: Vec<i64>,
}

/// 校验分类与标签存在性（公共）。
async fn validate_category_tags(
    pool: &sqlx::PgPool,
    category_id: Option<i64>,
    tags: &[i64],
) -> ApiResult<()> {
    if let Some(cid) = category_id {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment_categories WHERE id = $1)")
                .bind(cid)
                .fetch_one(pool)
                .await
                .map_err(AppError::Database)?;
        if !exists {
            return Err(AppError::BadRequest(format!(
                "category {cid} does not exist"
            )));
        }
    }
    if !tags.is_empty() {
        let found: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tags WHERE id = ANY($1)")
            .bind(tags)
            .fetch_one(pool)
            .await
            .map_err(AppError::Database)?;
        if found != tags.len() as i64 {
            return Err(AppError::BadRequest(
                "one or more tags do not exist".to_string(),
            ));
        }
    }
    Ok(())
}

/// 替换设备标签（事务内调用）。
async fn replace_equipment_tags(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    equipment_id: i64,
    tags: &[i64],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM equipment_tags WHERE equipment_id = $1")
        .bind(equipment_id)
        .execute(&mut **tx)
        .await
        .map_err(AppError::Database)?;
    for tag_id in tags {
        sqlx::query("INSERT INTO equipment_tags (equipment_id, tag_id) VALUES ($1, $2)")
            .bind(equipment_id)
            .bind(tag_id)
            .execute(&mut **tx)
            .await
            .map_err(AppError::Database)?;
    }
    Ok(())
}

/// `POST /api/admin/equipment` — 新增设备。
pub async fn create_equipment(
    State(state): State<AppState>,
    Json(payload): Json<EquipmentPayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Equipment>>)> {
    if payload.name.trim().is_empty()
        || payload.model.trim().is_empty()
        || payload.manufacturer.trim().is_empty()
    {
        return Err(AppError::BadRequest(
            "name, model and manufacturer are required".to_string(),
        ));
    }
    validate_category_tags(&state.pool, payload.category_id, &payload.tags).await?;

    let mut tx = state.pool.begin().await.map_err(AppError::Database)?;
    let equipment: Equipment = sqlx::query_as::<_, Equipment>(
        "INSERT INTO equipment (name, model, manufacturer, category_id, description, cover_image)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, model, manufacturer, category_id, description, cover_image, created_at, updated_at",
    )
    .bind(payload.name.trim())
    .bind(payload.model.trim())
    .bind(payload.manufacturer.trim())
    .bind(payload.category_id)
    .bind(payload.description.trim())
    .bind(payload.cover_image)
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    replace_equipment_tags(&mut tx, equipment.id, &payload.tags).await?;
    tx.commit().await.map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(equipment))))
}

/// `PUT /api/admin/equipment/{id}` — 编辑设备（含标签整体替换）。
pub async fn update_equipment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<EquipmentPayload>,
) -> ApiResult<Json<ApiOk<Equipment>>> {
    validate_category_tags(&state.pool, payload.category_id, &payload.tags).await?;

    let mut tx = state.pool.begin().await.map_err(AppError::Database)?;
    let equipment: Option<Equipment> = sqlx::query_as::<_, Equipment>(
        "UPDATE equipment SET name = $2, model = $3, manufacturer = $4, category_id = $5,
                description = $6, cover_image = $7, updated_at = now()
         WHERE id = $1
         RETURNING id, name, model, manufacturer, category_id, description, cover_image, created_at, updated_at",
    )
    .bind(id)
    .bind(payload.name.trim())
    .bind(payload.model.trim())
    .bind(payload.manufacturer.trim())
    .bind(payload.category_id)
    .bind(payload.description.trim())
    .bind(payload.cover_image)
    .fetch_optional(&mut *tx)
    .await
    .map_err(AppError::Database)?;

    let equipment =
        equipment.ok_or_else(|| AppError::NotFound(format!("equipment {id} not found")))?;
    replace_equipment_tags(&mut tx, equipment.id, &payload.tags).await?;
    tx.commit().await.map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(equipment)))
}

/// `DELETE /api/admin/equipment/{id}` — 删除设备（外键级联清理关联内容）。
pub async fn delete_equipment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM equipment WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("equipment {id} not found")));
    }
    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}

// ---------------------------------------------------------------------------
// 资料管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct DocumentPayload {
    pub equipment_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub category: String,
    pub file_url: String,
    pub file_type: String,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub version: Option<String>,
    pub language: Option<String>,
    pub is_primary: Option<bool>,
    pub download_enabled: Option<bool>,
}

/// `POST /api/admin/documents` — 保存资料记录（file_url 来自上传接口）。
pub async fn create_document(
    State(state): State<AppState>,
    Json(payload): Json<DocumentPayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Document>>)> {
    if payload.title.trim().is_empty() || payload.file_url.trim().is_empty() {
        return Err(AppError::BadRequest(
            "title and file_url are required".to_string(),
        ));
    }
    let equipment_exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment WHERE id = $1)")
            .bind(payload.equipment_id)
            .fetch_one(&state.pool)
            .await
            .map_err(AppError::Database)?;
    if !equipment_exists {
        return Err(AppError::NotFound(format!(
            "equipment {} not found",
            payload.equipment_id
        )));
    }

    let file_extension = payload.file_type.trim().to_ascii_lowercase();
    let preview_type = preview_type_of(&payload.file_type);

    let document: Document = sqlx::query_as::<_, Document>(
        "INSERT INTO documents
            (equipment_id, title, description, file_url, file_type, category, version, language, file_size, mime_type, storage_type, file_extension, preview_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                storage_type, file_extension, preview_type, download_enabled, thumbnail_url, \
                created_at, updated_at",
    )
    .bind(payload.equipment_id)
    .bind(payload.title.trim())
    .bind(payload.description.clone().unwrap_or_default().trim())
    .bind(&payload.file_url)
    .bind(payload.file_type.trim())
    .bind(payload.category.trim())
    .bind(payload.version.clone().unwrap_or_else(|| "1.0".to_string()).trim())
    .bind(payload.language.clone().unwrap_or_else(|| "zh".to_string()).trim())
    .bind(payload.file_size.unwrap_or(0))
    .bind(payload.mime_type.clone().unwrap_or_default().trim())
    .bind(state.storage.storage_type())
    .bind(&file_extension)
    .bind(preview_type)
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    // 图片资料同步图片集合
    if preview_type == "image" {
        sqlx::query(
            "INSERT INTO document_images (document_id, image_url, sort_order) VALUES ($1, $2, 0)",
        )
        .bind(document.id)
        .bind(&document.file_url)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    }

    Ok((StatusCode::CREATED, Json(ApiOk::success(document))))
}

/// `PUT /api/admin/documents/{id}` — 编辑资料元数据。
pub async fn update_document(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<DocumentPayload>,
) -> ApiResult<Json<ApiOk<Document>>> {
    let document: Option<Document> = sqlx::query_as::<_, Document>(
        "UPDATE documents SET title = $2, description = $3, category = $4, version = $5,
                language = $6, is_primary = COALESCE($7, is_primary),
                download_enabled = COALESCE($8, download_enabled), updated_at = now()
         WHERE id = $1
         RETURNING id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                storage_type, file_extension, preview_type, download_enabled, thumbnail_url, \
                created_at, updated_at",
    )
    .bind(id)
    .bind(payload.title.trim())
    .bind(payload.description.clone().unwrap_or_default().trim())
    .bind(payload.category.trim())
    .bind(
        payload
            .version
            .clone()
            .unwrap_or_else(|| "1.0".to_string())
            .trim(),
    )
    .bind(
        payload
            .language
            .clone()
            .unwrap_or_else(|| "zh".to_string())
            .trim(),
    )
    .bind(payload.is_primary)
    .bind(payload.download_enabled)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match document {
        Some(doc) => Ok(Json(ApiOk::success(doc))),
        None => Err(AppError::NotFound(format!("document {id} not found"))),
    }
}

/// `DELETE /api/admin/documents/{id}` — 删除资料（同时删除存储文件）。
pub async fn delete_document(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let document: Option<Document> = sqlx::query_as::<_, Document>(
        "SELECT id, equipment_id, title, description, file_url, file_type, category, \
                version, language, file_size, mime_type, download_count, is_primary, \
                storage_type, file_extension, preview_type, download_enabled, thumbnail_url, \
                created_at, updated_at
         FROM documents WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    let document =
        document.ok_or_else(|| AppError::NotFound(format!("document {id} not found")))?;

    sqlx::query("DELETE FROM documents WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;

    // 删除存储文件（本地路径键；R2 后端接入后同样适用）
    if let Some(key) = document.file_url.strip_prefix("/files/") {
        let _ = state.storage.delete_file(key);
    }

    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}

// ---------------------------------------------------------------------------
// 文章管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct ArticlePayload {
    pub title: String,
    pub equipment_id: Option<i64>,
    pub content: String,
    #[serde(rename = "type")]
    pub article_type: String,
    pub summary: Option<String>,
    pub cover_image: Option<String>,
}

/// `POST /api/admin/articles` — 发布维修文章（slug 自动生成）。
pub async fn create_article(
    State(state): State<AppState>,
    Json(payload): Json<ArticlePayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Article>>)> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    let slug = unique_slug(&state.pool, &slugify(&payload.title)).await?;
    let summary = payload
        .summary
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            let plain = payload
                .content
                .replace(['#', '*', '`', '>', '|', '-', '\n'], " ");
            plain.trim().chars().take(200).collect()
        });

    let article: Article = sqlx::query_as::<_, Article>(
        "INSERT INTO articles (equipment_id, title, slug, summary, content, cover_image, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, equipment_id, title, slug, summary, content, cover_image, \
                   type AS article_type, created_at, updated_at",
    )
    .bind(payload.equipment_id)
    .bind(payload.title.trim())
    .bind(&slug)
    .bind(summary.trim())
    .bind(payload.content.trim())
    .bind(payload.cover_image)
    .bind(payload.article_type.trim())
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(article))))
}

/// 生成不冲突的 slug（冲突追加时间戳）。
async fn unique_slug(pool: &sqlx::PgPool, base: &str) -> Result<String, AppError> {
    let mut slug = base.to_string();
    loop {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM articles WHERE slug = $1)")
                .bind(&slug)
                .fetch_one(pool)
                .await
                .map_err(AppError::Database)?;
        if !exists {
            return Ok(slug);
        }
        slug = format!("{base}-{}", chrono::Utc::now().timestamp());
    }
}

/// `PUT /api/admin/articles/{id}` — 编辑文章。
pub async fn update_article(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<ArticlePayload>,
) -> ApiResult<Json<ApiOk<Article>>> {
    let summary = payload
        .summary
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            let plain = payload
                .content
                .replace(['#', '*', '`', '>', '|', '-', '\n'], " ");
            plain.trim().chars().take(200).collect()
        });

    let article: Option<Article> = sqlx::query_as::<_, Article>(
        "UPDATE articles SET title = $2, equipment_id = $3, content = $4, summary = $5,
                cover_image = $6, type = $7, updated_at = now()
         WHERE id = $1
         RETURNING id, equipment_id, title, slug, summary, content, cover_image, \
                   type AS article_type, created_at, updated_at",
    )
    .bind(id)
    .bind(payload.title.trim())
    .bind(payload.equipment_id)
    .bind(payload.content.trim())
    .bind(summary.trim())
    .bind(payload.cover_image)
    .bind(payload.article_type.trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match article {
        Some(a) => Ok(Json(ApiOk::success(a))),
        None => Err(AppError::NotFound(format!("article {id} not found"))),
    }
}

/// `DELETE /api/admin/articles/{id}` — 删除文章。
pub async fn delete_article(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM articles WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("article {id} not found")));
    }
    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}

// ---------------------------------------------------------------------------
// 故障管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct FaultPayload {
    pub equipment_id: i64,
    pub title: String,
    pub symptom: String,
    pub reason: String,
    pub solution: String,
}

/// `POST /api/admin/faults` — 新增故障。
pub async fn create_fault(
    State(state): State<AppState>,
    Json(payload): Json<FaultPayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Fault>>)> {
    let fault: Fault = sqlx::query_as::<_, Fault>(
        "INSERT INTO faults (equipment_id, title, symptom, reason, solution)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, equipment_id, title, symptom, reason, solution, created_at",
    )
    .bind(payload.equipment_id)
    .bind(payload.title.trim())
    .bind(payload.symptom.trim())
    .bind(payload.reason.trim())
    .bind(payload.solution.trim())
    .fetch_one(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(fault))))
}

/// `PUT /api/admin/faults/{id}` — 编辑故障。
pub async fn update_fault(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<FaultPayload>,
) -> ApiResult<Json<ApiOk<Fault>>> {
    let fault: Option<Fault> = sqlx::query_as::<_, Fault>(
        "UPDATE faults SET equipment_id = $2, title = $3, symptom = $4, reason = $5, solution = $6
         WHERE id = $1
         RETURNING id, equipment_id, title, symptom, reason, solution, created_at",
    )
    .bind(id)
    .bind(payload.equipment_id)
    .bind(payload.title.trim())
    .bind(payload.symptom.trim())
    .bind(payload.reason.trim())
    .bind(payload.solution.trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match fault {
        Some(f) => Ok(Json(ApiOk::success(f))),
        None => Err(AppError::NotFound(format!("fault {id} not found"))),
    }
}

/// `DELETE /api/admin/faults/{id}` — 删除故障。
pub async fn delete_fault(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM faults WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("fault {id} not found")));
    }
    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}

// ---------------------------------------------------------------------------
// 分类管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct CategoryPayload {
    pub name: String,
    pub parent_id: Option<i64>,
    pub description: Option<String>,
}

/// `POST /api/admin/categories` — 新增分类。
pub async fn create_category(
    State(state): State<AppState>,
    Json(payload): Json<CategoryPayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Category>>)> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".to_string()));
    }
    let category: Category = sqlx::query_as::<_, Category>(
        "INSERT INTO equipment_categories (name, parent_id, description)
         VALUES ($1, $2, $3)
         RETURNING *",
    )
    .bind(payload.name.trim())
    .bind(payload.parent_id)
    .bind(payload.description.clone().unwrap_or_default().trim())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db) if db.code().as_deref() == Some("23505") => {
            AppError::BadRequest("category name already exists".to_string())
        }
        other => AppError::Database(other),
    })?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(category))))
}

/// `PUT /api/admin/categories/{id}` — 修改分类。
pub async fn update_category(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<CategoryPayload>,
) -> ApiResult<Json<ApiOk<Category>>> {
    let category: Option<Category> = sqlx::query_as::<_, Category>(
        "UPDATE equipment_categories SET name = $2, parent_id = $3, description = $4, updated_at = now()
         WHERE id = $1
         RETURNING *",
    )
    .bind(id)
    .bind(payload.name.trim())
    .bind(payload.parent_id)
    .bind(payload.description.clone().unwrap_or_default().trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match category {
        Some(c) => Ok(Json(ApiOk::success(c))),
        None => Err(AppError::NotFound(format!("category {id} not found"))),
    }
}

/// `DELETE /api/admin/categories/{id}` — 删除分类（子分类级联删除，设备归未分类）。
pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM equipment_categories WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("category {id} not found")));
    }
    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}

// ---------------------------------------------------------------------------
// 标签管理
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
pub struct TagPayload {
    pub name: String,
    pub description: Option<String>,
}

/// `POST /api/admin/tags` — 新增标签。
pub async fn create_tag(
    State(state): State<AppState>,
    Json(payload): Json<TagPayload>,
) -> ApiResult<(StatusCode, Json<ApiOk<Tag>>)> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".to_string()));
    }
    let tag: Tag = sqlx::query_as::<_, Tag>(
        "INSERT INTO tags (name, description) VALUES ($1, $2) RETURNING *",
    )
    .bind(payload.name.trim())
    .bind(payload.description.clone().unwrap_or_default().trim())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db) if db.code().as_deref() == Some("23505") => {
            AppError::BadRequest("tag name already exists".to_string())
        }
        other => AppError::Database(other),
    })?;

    Ok((StatusCode::CREATED, Json(ApiOk::success(tag))))
}

/// `PUT /api/admin/tags/{id}` — 修改标签。
pub async fn update_tag(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<TagPayload>,
) -> ApiResult<Json<ApiOk<Tag>>> {
    let tag: Option<Tag> = sqlx::query_as::<_, Tag>(
        "UPDATE tags SET name = $2, description = $3 WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .bind(payload.name.trim())
    .bind(payload.description.clone().unwrap_or_default().trim())
    .fetch_optional(&state.pool)
    .await
    .map_err(AppError::Database)?;

    match tag {
        Some(t) => Ok(Json(ApiOk::success(t))),
        None => Err(AppError::NotFound(format!("tag {id} not found"))),
    }
}

/// `DELETE /api/admin/tags/{id}` — 删除标签（关联记录级联清理）。
pub async fn delete_tag(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> ApiResult<Json<ApiOk<serde_json::Value>>> {
    let result = sqlx::query("DELETE FROM tags WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(AppError::Database)?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("tag {id} not found")));
    }
    Ok(Json(ApiOk::success(serde_json::json!({ "deleted": id }))))
}
