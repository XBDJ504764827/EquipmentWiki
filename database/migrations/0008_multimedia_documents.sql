-- =====================================================================
-- EquipmentWiki — Migration 0008
-- Multimedia document management
--
-- 1. documents 新增存储/预览元数据字段
-- 2. document_images: 图片集合（一个设备可有多张图片）
-- 3. category 扩展: image / cad / archive
-- =====================================================================

-- ---------- documents: 元数据字段 ----------
ALTER TABLE documents
    ADD COLUMN storage_type    VARCHAR(20)  NOT NULL DEFAULT 'local',
    ADD COLUMN file_extension  VARCHAR(20)  NOT NULL DEFAULT '',
    ADD COLUMN preview_type    VARCHAR(20)  NOT NULL DEFAULT 'none',
    ADD COLUMN download_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN thumbnail_url   TEXT;

-- ---------- category 扩展（图片 / CAD / 压缩包） ----------
ALTER TABLE documents DROP CONSTRAINT chk_documents_category;
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_category
    CHECK (category IN
        ('manual', 'repair', 'electrical', 'parameter', 'software', 'other',
         'video_debug', 'video_setup', 'image', 'cad', 'archive'));

-- ---------- document_images: 图片集合 ----------
-- 每张图片文档对应一条记录；多张图片可聚合展示（设备照片/接线图/电路图/结构图）
CREATE TABLE document_images (
    id          BIGSERIAL PRIMARY KEY,
    document_id BIGINT  NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    image_url   TEXT    NOT NULL,
    -- 展示顺序（小→大）
    sort_order  INT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 按文档查图片集合
CREATE INDEX idx_document_images_document ON document_images (document_id);

-- ---------- 旧数据回填：按 file_type 推断 preview_type / file_extension ----------
UPDATE documents SET preview_type = 'pdf'   WHERE file_type = 'pdf';
UPDATE documents SET preview_type = 'image' WHERE file_type IN ('png', 'jpg', 'jpeg', 'webp', 'img', 'gif');
UPDATE documents SET preview_type = 'video' WHERE file_type IN ('mp4', 'webm');
UPDATE documents SET file_extension = file_type WHERE file_extension = '';

-- 旧图片文档回填图片集合
INSERT INTO document_images (document_id, image_url, sort_order)
SELECT d.id, d.file_url, 0
FROM documents d
WHERE d.preview_type = 'image'
  AND NOT EXISTS (SELECT 1 FROM document_images di WHERE di.document_id = d.id);
