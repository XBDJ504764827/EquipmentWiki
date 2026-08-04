//! Tag data model.
//!
//! Maps to the `tags` table and the `equipment_tags` many-to-many join.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single tag row.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Tag {
    pub id: i64,
    /// 标签名称
    pub name: String,
    /// 标签描述
    pub description: String,
    pub created_at: DateTime<Utc>,
}

/// Tag with its equipment count (used by the tag list endpoint).
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct TagWithCount {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    /// 关联设备数量
    pub equipment_count: i64,
}
