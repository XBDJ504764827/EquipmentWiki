-- =====================================================================
-- EquipmentWiki — Migration 0009
-- Full-text search & content index
--
-- 1. documents.text_content: 保存未来提取的 PDF 文本（当前阶段为空）
-- 2. 四张内容表增加 search_vector (tsvector) 生成列 + GIN 索引：
--    articles(title/summary/content)
--    faults(title/symptom/reason/solution)
--    documents(title/description/text_content)
--    equipment(name/model/manufacturer)
--
-- 使用 'simple' 分词配置：对中英文混排的内容最稳妥
-- （PostgreSQL 内置中文分词需 zhparser 扩展，当前用 ILIKE/pg_trgm 补充中文子串匹配）。
-- =====================================================================

-- ---------- 1. documents.text_content（PDF 文本预留） ----------
ALTER TABLE documents ADD COLUMN text_content TEXT NOT NULL DEFAULT '';

-- ---------- 2. tsvector 生成列 ----------
ALTER TABLE equipment ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(name, '') || ' ' || coalesce(model, '') || ' ' || coalesce(manufacturer, ''))
    ) STORED;

ALTER TABLE documents ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(text_content, ''))
    ) STORED;

ALTER TABLE articles ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
    ) STORED;

ALTER TABLE faults ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(title, '') || ' ' || coalesce(symptom, '') || ' ' ||
            coalesce(reason, '') || ' ' || coalesce(solution, ''))
    ) STORED;

-- ---------- 3. GIN 索引（全文检索加速） ----------
CREATE INDEX idx_equipment_search_vector ON equipment USING gin (search_vector);
CREATE INDEX idx_documents_search_vector ON documents USING gin (search_vector);
CREATE INDEX idx_articles_search_vector ON articles USING gin (search_vector);
CREATE INDEX idx_faults_search_vector ON faults USING gin (search_vector);
