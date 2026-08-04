//! Business logic services.
//!
//! - [`storage`]: file storage abstraction (local backend now,
//!   Cloudflare R2 pluggable later).
//! - [`indexer`]: document content indexing (text_content maintenance,
//!   PDF/vector index reserved).

pub mod indexer;
pub mod storage;
