-- =====================================================================
-- EquipmentWiki — Migration 0007
-- Video document categories
--
-- 设备视频说明书分类：
--   video_debug  调试视频
--   video_setup  设置视频
-- =====================================================================

ALTER TABLE documents DROP CONSTRAINT chk_documents_category;
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_category
    CHECK (category IN
        ('manual', 'repair', 'electrical', 'parameter', 'software', 'other',
         'video_debug', 'video_setup'));
