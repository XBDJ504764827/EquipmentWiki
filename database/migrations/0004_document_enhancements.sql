-- =====================================================================
-- EquipmentWiki — Migration 0004
-- Document model enhancement
--
-- 1. Add version / language / file_size / mime_type / download_count /
--    is_primary / updated_at columns (with defaults, old data stays valid).
-- 2. Update category taxonomy: diagram -> electrical; add software.
-- =====================================================================

-- 先放开旧分类约束，再迁移数据、加新约束
ALTER TABLE documents DROP CONSTRAINT chk_documents_category;

ALTER TABLE documents
    ADD COLUMN version        VARCHAR(50)  NOT NULL DEFAULT '1.0',
    ADD COLUMN language       VARCHAR(20)  NOT NULL DEFAULT 'zh',
    ADD COLUMN file_size      BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN mime_type      VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN download_count BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now();

-- 旧分类 diagram（图纸）归入 electrical（电气图纸）
UPDATE documents SET category = 'electrical' WHERE category = 'diagram';

-- 新分类集合：manual / repair / electrical / parameter / software / other
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_category
    CHECK (category IN ('manual', 'repair', 'electrical', 'parameter', 'software', 'other'));
