//! Article REST API.
//!
//! Endpoints:
//!
//! - `GET  /api/articles`                  list (page/limit/type/equipment_id filters)
//! - `GET  /api/articles/{id_or_slug}`     article detail (by numeric id or slug)
//! - `GET  /api/equipment/{id}/articles`   articles of an equipment
//! - `POST /api/articles`                  create article (testing)

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use serde::Deserialize;

use crate::models::{
    api::{ApiOk, ApiResult, AppError},
    article::{Article, ArticleList, ArticleWithEquipment, CreateArticle, slugify},
};
use crate::routes::AppState;

/// 文章 SELECT 列（`type` 列为关键字，别名到 `article_type`）。
const ARTICLE_SELECT: &str = "a.id, a.equipment_id, a.title, a.slug, a.summary, a.content, \
     a.cover_image, a.type AS article_type, a.created_at, a.updated_at";

/// Query parameters for the article list endpoint.
#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    /// 按文章类型筛选：repair / guide / maintenance / experience / other
    #[serde(rename = "type")]
    pub article_type: Option<String>,
    /// 按设备筛选
    pub equipment_id: Option<i64>,
}

/// `GET /api/articles` — paginated article list (with equipment name).
pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> ApiResult<Json<ApiOk<ArticleList>>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    // 动态筛选条件
    let mut where_clauses: Vec<String> = Vec::new();
    let mut binds: Vec<String> = Vec::new();

    if let Some(t) = params.article_type.filter(|t| !t.is_empty()) {
        where_clauses.push(format!("a.type = ${}", binds.len() + 1));
        binds.push(t);
    }
    if let Some(eq) = params.equipment_id {
        where_clauses.push(format!("a.equipment_id = ${}", binds.len() + 1));
        binds.push(eq.to_string());
    }

    let where_sql = if where_clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_clauses.join(" AND "))
    };

    // total
    let count_query = format!("SELECT COUNT(*) FROM articles a {where_sql}");
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_query);
    for b in &binds {
        count_q = count_q.bind(b);
    }
    let total: i64 = count_q
        .fetch_one(&state.pool)
        .await
        .map_err(AppError::Database)?;

    // items
    let items_query = format!(
        "SELECT {ARTICLE_SELECT}, e.name AS equipment_name
         FROM articles a
         LEFT JOIN equipment e ON e.id = a.equipment_id
         {where_sql}
         ORDER BY a.created_at DESC
         LIMIT ${} OFFSET ${}",
        binds.len() + 1,
        binds.len() + 2
    );
    let mut q = sqlx::query_as::<_, ArticleWithEquipment>(&items_query);
    for b in &binds {
        q = q.bind(b);
    }
    let items: Vec<ArticleWithEquipment> = q
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(ArticleList {
        items,
        page,
        limit,
        total,
    })))
}

/// `GET /api/articles/{id_or_slug}` — article detail.
///
/// 路由参数可以是数字 ID 或 slug（如 `fx5u-communication-error`）。
pub async fn detail(
    State(state): State<AppState>,
    Path(id_or_slug): Path<String>,
) -> ApiResult<Json<ApiOk<ArticleWithEquipment>>> {
    let article: Option<ArticleWithEquipment> = if let Ok(id) = id_or_slug.parse::<i64>() {
        // 数字 → 按 ID 查
        sqlx::query_as::<_, ArticleWithEquipment>(
            "SELECT a.id, a.equipment_id, a.title, a.slug, a.summary, a.content,
                    a.cover_image, a.type AS article_type, a.created_at, a.updated_at,
                    e.name AS equipment_name
             FROM articles a
             LEFT JOIN equipment e ON e.id = a.equipment_id
             WHERE a.id = $1",
        )
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(AppError::Database)?
    } else {
        // 非数字 → 按 slug 查
        sqlx::query_as::<_, ArticleWithEquipment>(
            "SELECT a.id, a.equipment_id, a.title, a.slug, a.summary, a.content,
                    a.cover_image, a.type AS article_type, a.created_at, a.updated_at,
                    e.name AS equipment_name
             FROM articles a
             LEFT JOIN equipment e ON e.id = a.equipment_id
             WHERE a.slug = $1",
        )
        .bind(&id_or_slug)
        .fetch_optional(&state.pool)
        .await
        .map_err(AppError::Database)?
    };

    match article {
        Some(article) => Ok(Json(ApiOk::success(article))),
        None => Err(AppError::NotFound(format!(
            "article {id_or_slug} not found"
        ))),
    }
}

/// `GET /api/equipment/{id}/articles` — articles related to an equipment.
pub async fn list_by_equipment(
    State(state): State<AppState>,
    Path(equipment_id): Path<i64>,
) -> ApiResult<Json<ApiOk<Vec<ArticleWithEquipment>>>> {
    let items: Vec<ArticleWithEquipment> = sqlx::query_as::<_, ArticleWithEquipment>(
        "SELECT a.id, a.equipment_id, a.title, a.slug, a.summary, a.content,
                a.cover_image, a.type AS article_type, a.created_at, a.updated_at,
                e.name AS equipment_name
         FROM articles a
         LEFT JOIN equipment e ON e.id = a.equipment_id
         WHERE a.equipment_id = $1
         ORDER BY a.created_at DESC",
    )
    .bind(equipment_id)
    .fetch_all(&state.pool)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(ApiOk::success(items)))
}

/// `POST /api/articles` — create an article (testing).
///
/// `slug` 可选：未提供时由标题自动生成（ASCII 提取；纯中文回退 article-{ts}），
/// 冲突时追加时间戳后缀。
pub async fn create(
    State(state): State<AppState>,
    Json(payload): Json<CreateArticle>,
) -> ApiResult<(StatusCode, Json<ApiOk<Article>>)> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    // 设备存在性校验（提供时）
    if let Some(eq_id) = payload.equipment_id {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM equipment WHERE id = $1)")
                .bind(eq_id)
                .fetch_one(&state.pool)
                .await
                .map_err(AppError::Database)?;
        if !exists {
            return Err(AppError::NotFound(format!("equipment {eq_id} not found")));
        }
    }

    // slug：用户提供 或 自动生成；冲突则加时间戳后缀
    let base_slug = payload
        .slug
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| slugify(&payload.title));

    let mut slug = base_slug.clone();
    loop {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM articles WHERE slug = $1)")
                .bind(&slug)
                .fetch_one(&state.pool)
                .await
                .map_err(AppError::Database)?;
        if !exists {
            break;
        }
        slug = format!("{}-{}", base_slug, chrono::Utc::now().timestamp());
    }

    // 摘要：未提供时从正文截取前 200 字符
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
         RETURNING id, equipment_id, title, slug, summary, content, cover_image,
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
