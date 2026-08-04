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
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}
