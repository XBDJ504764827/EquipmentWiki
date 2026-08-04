//! Fault knowledge data model.
//!
//! Maps to the `faults` table — common faults with symptom / reason / solution.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single fault record (database row).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Fault {
    pub id: i64,
    /// 关联的设备 ID
    pub equipment_id: i64,
    /// 故障标题，如"设备无法启动"
    pub title: String,
    /// 故障现象
    pub symptom: String,
    /// 故障原因
    pub reason: String,
    /// 解决方案
    pub solution: String,
    /// 创建时间
    pub created_at: DateTime<Utc>,
}

/// Payload for creating a fault record.
#[derive(Debug, Clone, Deserialize)]
pub struct CreateFault {
    pub equipment_id: i64,
    pub title: String,
    pub symptom: String,
    pub reason: String,
    pub solution: String,
}
