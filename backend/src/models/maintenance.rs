//! Maintenance knowledge data model.
//!
//! Maps to the `maintenance` table — scheduled maintenance items.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single maintenance record (database row).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Maintenance {
    pub id: i64,
    /// 关联的设备 ID
    pub equipment_id: i64,
    /// 维护项目标题，如"定期检查散热风扇"
    pub title: String,
    /// 维护内容
    pub content: String,
    /// 维护周期，如"6个月"
    pub cycle: String,
    /// 创建时间
    pub created_at: DateTime<Utc>,
}
