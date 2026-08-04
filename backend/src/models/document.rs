//! Document (equipment file) data model.
//!
//! Maps to the `documents` table — equipment-related files such as
//! manuals, repair guides, electrical diagrams and parameter sheets.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single document record (database row).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Document {
    pub id: i64,
    /// 关联的设备 ID
    pub equipment_id: i64,
    /// 资料标题
    pub title: String,
    /// 资料描述
    pub description: String,
    /// 文件访问地址（/files/... 或外部 URL）
    pub file_url: String,
    /// 文件扩展名类型：pdf / png / jpg / webp / doc / xls ...
    pub file_type: String,
    /// 资料分类：manual / repair / electrical / parameter / software / other
    pub category: String,
    /// 文档版本，如 "1.0"
    pub version: String,
    /// 文档语言，如 "zh" / "en"
    pub language: String,
    /// 文件大小（字节）
    pub file_size: i64,
    /// MIME 类型，如 application/pdf
    pub mime_type: String,
    /// 累计下载次数
    pub download_count: i64,
    /// 是否为主要文档（如首选说明书）
    pub is_primary: bool,
    /// 存储类型：local / r2
    pub storage_type: String,
    /// 文件扩展名：pdf / jpg / dwg / zip ...
    pub file_extension: String,
    /// 预览类型：pdf / image / video / none
    pub preview_type: String,
    /// 是否允许下载
    pub download_enabled: bool,
    /// 缩略图地址（图片类资料自动生成）
    pub thumbnail_url: Option<String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 图片集合条目（document_images 表）。
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentImage {
    pub id: i64,
    /// 所属文档 ID
    pub document_id: i64,
    /// 图片地址
    pub image_url: String,
    /// 展示顺序
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

/// 根据文件扩展名推断预览类型。
pub fn preview_type_of(file_type: &str) -> &'static str {
    match file_type {
        "pdf" => "pdf",
        "png" | "jpg" | "jpeg" | "webp" | "img" | "gif" => "image",
        "mp4" | "webm" => "video",
        _ => "none",
    }
}
