//! 文档内容索引服务（预留接口）。
//!
//! 当前阶段职责：
//! - 维护 `documents.text_content`（未来保存 PDF 提取文本）
//!
//! 接口设计对齐未来能力（仅声明、不实现具体抽取逻辑）：
//! - PDF 文本提取（pdf-rs 等）
//! - AI 向量索引（pgvector，当前不引入）
//!
//! 接入点统一从这里进入，替换实现时无需改动业务路由。

use sqlx::PgPool;

/// 文档索引服务。
///
/// 当前为预留接口（PDF 文本提取/向量索引尚未接入），
/// 保留给后续阶段调用，故允许 dead_code。
#[allow(dead_code)]
pub struct Indexer;

#[allow(dead_code)]
impl Indexer {
    /// 为文档建立索引：保存全文文本到 `text_content`。
    ///
    /// 未来扩展：提取 PDF 文本 → 写入 text_content → （可选）同步向量索引。
    pub async fn index_document(
        pool: &PgPool,
        document_id: i64,
        text: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE documents SET text_content = $2 WHERE id = $1")
            .bind(document_id)
            .bind(text)
            .execute(pool)
            .await?;
        Ok(())
    }

    /// 更新索引：文档内容变化时重新写入文本。
    pub async fn update_index(
        pool: &PgPool,
        document_id: i64,
        text: &str,
    ) -> Result<(), sqlx::Error> {
        Self::index_document(pool, document_id, text).await
    }

    /// 移除索引：清空文本内容（文档删除或内容失效时调用）。
    pub async fn remove_index(pool: &PgPool, document_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE documents SET text_content = '' WHERE id = $1")
            .bind(document_id)
            .execute(pool)
            .await?;
        Ok(())
    }
}
