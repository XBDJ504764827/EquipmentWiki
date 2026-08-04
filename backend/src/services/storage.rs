//! File storage abstraction layer.
//!
//! Design goals:
//! - Handlers depend only on the [`Storage`] trait, not on a concrete cloud.
//! - Cloudflare R2 can be added later as another `Storage` implementation
//!   (S3-compatible, using the `R2_*` env vars from `.env`).
//! - The current implementation ([`LocalStorage`]) stores files on the local
//!   filesystem for development/testing.

use std::{
    fs,
    path::{Path, PathBuf},
};

/// Errors produced by storage backends.
#[derive(Debug)]
pub struct StorageError(pub String);

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<std::io::Error> for StorageError {
    fn from(err: std::io::Error) -> Self {
        Self(err.to_string())
    }
}

/// Storage backend interface.
pub trait Storage: Send + Sync {
    /// Upload a file, returns its public URL.
    ///
    /// `key` is a logical path, e.g. `equipment/3/manual.pdf`.
    fn upload_file(&self, key: &str, bytes: &[u8]) -> Result<String, StorageError>;

    /// Delete a file by key. Returns Ok even if the file does not exist.
    ///
    /// (Not yet wired to any endpoint; part of the storage abstraction
    /// contract for future document-management features.)
    #[allow(dead_code)]
    fn delete_file(&self, key: &str) -> Result<(), StorageError>;

    /// Read a file's raw bytes by key (used by the download endpoint).
    fn read_file(&self, key: &str) -> Result<Vec<u8>, StorageError>;

    /// Resolve a key to its public URL.
    fn get_file_url(&self, key: &str) -> String;
}

// ---------------------------------------------------------------------------
// Local filesystem implementation
// ---------------------------------------------------------------------------

/// Local filesystem storage.
///
/// Files are stored under `base_dir` and served at `{public_prefix}/{key}`.
#[derive(Clone)]
pub struct LocalStorage {
    /// Root directory for file contents.
    base_dir: PathBuf,
    /// URL prefix, e.g. `/files`.
    public_prefix: String,
}

impl LocalStorage {
    /// Create a local storage rooted at `base_dir`.
    ///
    /// The directory is created if missing.
    pub fn new(base_dir: impl AsRef<Path>, public_prefix: &str) -> Result<Self, StorageError> {
        let base_dir = base_dir.as_ref().to_path_buf();
        fs::create_dir_all(&base_dir)?;
        Ok(Self {
            base_dir,
            public_prefix: public_prefix.trim_end_matches('/').to_string(),
        })
    }
}

impl Storage for LocalStorage {
    fn upload_file(&self, key: &str, bytes: &[u8]) -> Result<String, StorageError> {
        let path = self.base_dir.join(key);
        // Prevent path traversal outside the base dir.
        if !path.starts_with(&self.base_dir) {
            return Err(StorageError("invalid file key".to_string()));
        }
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, bytes)?;
        Ok(self.get_file_url(key))
    }

    fn delete_file(&self, key: &str) -> Result<(), StorageError> {
        let path = self.base_dir.join(key);
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }

    fn read_file(&self, key: &str) -> Result<Vec<u8>, StorageError> {
        let path = self.base_dir.join(key);
        // Prevent path traversal outside the base dir.
        if !path.starts_with(&self.base_dir) {
            return Err(StorageError("invalid file key".to_string()));
        }
        fs::read(&path).map_err(|e| StorageError(format!("file not found: {e}")))
    }

    fn get_file_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_prefix, key)
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a storage key for a document of the given equipment.
///
/// Keys look like `equipment/{equipment_id}/{timestamp}-{safe_filename}`
/// so the same logical file name never collides.
pub fn document_key(equipment_id: i64, file_name: &str) -> String {
    let ts = chrono::Utc::now().timestamp();
    let safe = sanitize_file_name(file_name);
    format!("equipment/{equipment_id}/{ts}-{safe}")
}

/// Strip directory components and unsafe characters from a file name.
pub fn sanitize_file_name(name: &str) -> String {
    let name = name.rsplit(['/', '\\']).next().unwrap_or(name);
    let safe: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    if safe.is_empty() { "file".to_string() } else { safe }
}

/// Map a MIME type / file extension to the `file_type` stored on documents.
pub fn file_type_of(mime: &str, file_name: &str) -> String {
    let ext = file_name
        .rsplit('.')
        .next()
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    match ext.as_str() {
        "pdf" => "pdf",
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        "doc" | "docx" => "doc",
        "xls" | "xlsx" => "xls",
        _ => {
            // Fall back to MIME type keywords.
            if mime.contains("pdf") {
                "pdf"
            } else if mime.starts_with("image/") {
                "img"
            } else {
                "other"
            }
        }
    }
    .to_string()
}
