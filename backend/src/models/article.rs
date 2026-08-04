//! Article (maintenance knowledge) data model.
//!
//! Maps to the `articles` table — web-form repair tutorials, operation
//! guides, maintenance guides and field experience articles.
//! Body content is stored as raw Markdown.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single article row.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Article {
    pub id: i64,
    /// 关联设备 ID（可空）
    pub equipment_id: Option<i64>,
    /// 文章标题
    pub title: String,
    /// URL 路径（SEO）
    pub slug: String,
    /// 文章摘要
    pub summary: String,
    /// Markdown 正文
    pub content: String,
    /// 封面图片（可选）
    pub cover_image: Option<String>,
    /// 文章类型：repair / guide / maintenance / experience / other
    pub article_type: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Article + parent equipment name (list & search results).
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ArticleWithEquipment {
    #[sqlx(flatten)]
    pub article: Article,
    /// 关联设备名称（NULL = 通用文章）
    pub equipment_name: Option<String>,
}

/// Payload for creating an article (testing endpoint).
#[derive(Debug, Clone, Deserialize)]
pub struct CreateArticle {
    /// 文章标题
    pub title: String,
    /// 关联设备 ID（可选）
    pub equipment_id: Option<i64>,
    /// Markdown 正文
    pub content: String,
    /// 文章类型：repair / guide / maintenance / experience / other
    #[serde(rename = "type")]
    pub article_type: String,
    /// URL 路径（可选，缺省自动生成）
    pub slug: Option<String>,
    /// 摘要（可选，缺省从正文截取）
    pub summary: Option<String>,
    /// 封面图片（可选）
    pub cover_image: Option<String>,
}

/// Paginated article list result.
#[derive(Debug, Clone, Serialize)]
pub struct ArticleList {
    pub items: Vec<ArticleWithEquipment>,
    pub page: i64,
    pub limit: i64,
    pub total: i64,
}

/// Generate a URL-safe slug from a title.
///
/// 提取 ASCII 字母数字并连字符化；纯中文标题回退为 `article-{timestamp}`。
pub fn slugify(title: &str) -> String {
    let mut s = String::new();
    let mut last_dash = false;
    for c in title.chars() {
        if c.is_ascii_alphanumeric() {
            s.push(c.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash && !s.is_empty() {
            s.push('-');
            last_dash = true;
        }
    }
    while s.ends_with('-') {
        s.pop();
    }
    if s.is_empty() {
        format!("article-{}", chrono::Utc::now().timestamp())
    } else {
        s
    }
}
