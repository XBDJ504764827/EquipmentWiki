//! Equipment data model.
//!
//! Maps to the `equipment` table
//! (see `database/migrations/0001_create_equipment.sql`).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::category::CategoryPathItem;
use super::tag::Tag;

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
    /// 所属分类 ID（NULL = 未分类）
    pub category_id: Option<i64>,
    /// 设备描述
    pub description: String,
    /// 封面图片地址（可选）
    pub cover_image: Option<String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// Equipment + category name (list & search results).
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct EquipmentWithCategory {
    #[sqlx(flatten)]
    pub equipment: Equipment,
    /// 所属分类名称（JOIN equipment_categories）
    pub category_name: Option<String>,
}

/// Full equipment detail: base fields + category path + tags.
#[derive(Debug, Clone, Serialize)]
pub struct EquipmentDetail {
    pub equipment: Equipment,
    /// 所属分类名称
    pub category_name: Option<String>,
    /// 分类路径（根 → 叶），用于面包屑
    pub category_path: Vec<CategoryPathItem>,
    /// 设备标签
    pub tags: Vec<Tag>,
}

/// Payload for creating a new equipment record (testing endpoint).
#[derive(Debug, Clone, Deserialize)]
pub struct CreateEquipment {
    /// 设备名称
    pub name: String,
    /// 设备型号
    pub model: String,
    /// 制造商
    pub manufacturer: String,
    /// 所属分类 ID（可选）
    pub category_id: Option<i64>,
    /// 设备描述
    pub description: String,
    /// 标签 ID 列表（可选）
    #[serde(default)]
    pub tags: Vec<i64>,
}

/// Paginated result of an equipment list query.
#[derive(Debug, Clone, Serialize)]
pub struct EquipmentList {
    pub items: Vec<EquipmentWithCategory>,
    pub page: i64,
    pub limit: i64,
    pub total: i64,
}
