//! Equipment data model.
//!
//! Maps to the `equipment` table
//! (see `database/migrations/0001_create_equipment.sql`).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single equipment record (database row).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Equipment {
    pub id: i64,
    /// 设备名称
    pub name: String,
    /// 设备型号
    pub model: String,
    /// 制造商
    pub manufacturer: String,
    /// 设备分类
    pub category: String,
    /// 设备描述
    pub description: String,
    /// 封面图片地址（可选）
    pub cover_image: Option<String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// Payload for creating a new equipment record (testing endpoint).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEquipment {
    /// 设备名称
    pub name: String,
    /// 设备型号
    pub model: String,
    /// 制造商
    pub manufacturer: String,
    /// 设备分类
    pub category: String,
    /// 设备描述
    pub description: String,
}

/// Paginated result of an equipment list query.
#[derive(Debug, Clone, Serialize)]
pub struct EquipmentList {
    pub items: Vec<Equipment>,
    pub page: i64,
    pub limit: i64,
    pub total: i64,
}
