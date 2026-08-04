//! Equipment category data model.
//!
//! Maps to the `equipment_categories` table — an infinite-depth tree
//! via the self-referencing `parent_id` column.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single category row.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Category {
    pub id: i64,
    /// 分类名称
    pub name: String,
    /// 父分类 ID（NULL = 根分类）
    pub parent_id: Option<i64>,
    /// 分类描述
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Tree node returned by `GET /api/categories` (nested children).
#[derive(Debug, Clone, Serialize)]
pub struct CategoryNode {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub children: Vec<CategoryNode>,
}

/// One item of a category path (root → leaf), e.g. 工业设备 → PLC → 三菱PLC.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct CategoryPathItem {
    pub id: i64,
    pub name: String,
}

impl CategoryNode {
    /// Build the category tree from a flat list of rows.
    pub fn build_tree(rows: &[Category]) -> Vec<CategoryNode> {
        use std::collections::HashMap;

        // Map: parent_id -> children rows
        let mut by_parent: HashMap<Option<i64>, Vec<&Category>> = HashMap::new();
        for row in rows {
            by_parent.entry(row.parent_id).or_default().push(row);
        }

        fn build(
            parent: Option<i64>,
            by_parent: &HashMap<Option<i64>, Vec<&Category>>,
        ) -> Vec<CategoryNode> {
            by_parent
                .get(&parent)
                .map(|children| {
                    let mut nodes: Vec<CategoryNode> = children
                        .iter()
                        .map(|c| CategoryNode {
                            id: c.id,
                            name: c.name.clone(),
                            description: c.description.clone(),
                            children: build(Some(c.id), by_parent),
                        })
                        .collect();
                    nodes.sort_by_key(|a| a.id);
                    nodes
                })
                .unwrap_or_default()
        }

        build(None, &by_parent)
    }
}
