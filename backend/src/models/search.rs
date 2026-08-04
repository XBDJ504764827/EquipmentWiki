//! Search data model.
//!
//! Results of `GET /api/search`: equipment / documents / faults / articles
//! hits, each enriched with an optional highlighted snippet.

use serde::Serialize;

use super::article::Article;
use super::document::Document;
use super::equipment::Equipment;
use super::fault::Fault;

// ---------------------------------------------------------------------------
// Highlighting helpers
// ---------------------------------------------------------------------------

/// 在文本中把所有关键词出现处包装为 `<strong>` 高亮。
fn highlight_all(text: &str, keyword: &str) -> String {
    let kw_lower = keyword.to_lowercase();
    let mut result = String::new();
    let mut rest = text;
    while let Some(pos) = rest.to_lowercase().find(&kw_lower) {
        let (before, after) = rest.split_at(pos);
        result.push_str(before);
        let (matched, remaining) = after.split_at(kw_lower.len());
        result.push_str("<strong>");
        result.push_str(matched);
        result.push_str("</strong>");
        rest = remaining;
    }
    result.push_str(rest);
    result
}

/// 生成匹配片段：定位关键词首次出现位置，截取前后上下文，并高亮。
///
/// 返回带 `<strong>` 标签的片段（如 `设备<strong>通讯异常</strong>需要检查...`），
/// 未匹配时返回 `None`。
pub fn highlight_snippet(text: &str, keyword: &str) -> Option<String> {
    let kw = keyword.trim();
    if text.is_empty() || kw.is_empty() {
        return None;
    }
    let text_lower = text.to_lowercase();
    let kw_lower = kw.to_lowercase();
    let pos = text_lower.find(&kw_lower)?;

    // 片段窗口：匹配前 30 字符 + 匹配本身 + 匹配后 60 字符（按字符计，安全处理 UTF-8）
    let before = &text[..pos];
    let before_char_count = before.chars().count();
    let start_offset = before_char_count.saturating_sub(30);
    let start = before
        .char_indices()
        .nth(start_offset)
        .map(|(i, _)| i)
        .unwrap_or(0);

    let window: String = text[start..].chars().take(90).collect();

    let prefix = if start > 0 { "..." } else { "" };
    let suffix = if start + window.len() < text.len() {
        "..."
    } else {
        ""
    };

    Some(format!("{prefix}{}{suffix}", highlight_all(&window, kw)))
}

/// 按字段优先级取第一个命中片段。
pub fn first_snippet(keyword: &str, fields: &[&str]) -> Option<String> {
    fields
        .iter()
        .filter_map(|f| highlight_snippet(f, keyword))
        .next()
}

// ---------------------------------------------------------------------------
// Hit structures
// ---------------------------------------------------------------------------

/// Equipment hit — equipment + category name + snippet.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct EquipmentHit {
    #[sqlx(flatten)]
    pub equipment: Equipment,
    /// 所属分类名称（JOIN equipment_categories）
    pub category_name: Option<String>,
    /// 匹配片段（`<strong>` 高亮），由服务端计算
    #[sqlx(skip)]
    pub snippet: Option<String>,
}

/// A document hit — document fields + parent equipment name + snippet.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct DocumentHit {
    #[sqlx(flatten)]
    pub document: Document,
    /// 所属设备名称（JOIN equipment）
    pub equipment_name: Option<String>,
    /// 匹配片段（`<strong>` 高亮），由服务端计算
    #[sqlx(skip)]
    pub snippet: Option<String>,
}

/// A fault hit — fault fields + parent equipment name + snippet.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct FaultHit {
    #[sqlx(flatten)]
    pub fault: Fault,
    /// 所属设备名称（JOIN equipment）
    pub equipment_name: Option<String>,
    /// 匹配片段（`<strong>` 高亮），由服务端计算
    #[sqlx(skip)]
    pub snippet: Option<String>,
}

/// An article hit — article fields + parent equipment name + snippet.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct ArticleHit {
    #[sqlx(flatten)]
    pub article: Article,
    /// 所属设备名称（JOIN equipment）
    pub equipment_name: Option<String>,
    /// 匹配片段（`<strong>` 高亮），由服务端计算
    #[sqlx(skip)]
    pub snippet: Option<String>,
}

/// Full search result payload.
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    /// 设备匹配结果（相关度排序）
    pub equipment: Vec<EquipmentHit>,
    /// 资料匹配结果（相关度排序）
    pub documents: Vec<DocumentHit>,
    /// 故障匹配结果（相关度排序）
    pub faults: Vec<FaultHit>,
    /// 维修文章匹配结果（相关度排序）
    pub articles: Vec<ArticleHit>,
}
