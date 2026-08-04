//! Search data model.
//!
//! Results of `GET /api/search`: equipment hits plus documents and faults
//! hits enriched with their parent equipment name.

use serde::Serialize;

use super::document::Document;
use super::equipment::Equipment;
use super::fault::Fault;

/// A document hit — document fields + parent equipment name.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct DocumentHit {
    #[sqlx(flatten)]
    pub document: Document,
    /// 所属设备名称（JOIN equipment）
    pub equipment_name: String,
}

/// A fault hit — fault fields + parent equipment name.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct FaultHit {
    #[sqlx(flatten)]
    pub fault: Fault,
    /// 所属设备名称（JOIN equipment）
    pub equipment_name: String,
}

/// Full search result payload.
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    /// 设备匹配结果
    pub equipment: Vec<Equipment>,
    /// 资料匹配结果
    pub documents: Vec<DocumentHit>,
    /// 故障匹配结果
    pub faults: Vec<FaultHit>,
}
