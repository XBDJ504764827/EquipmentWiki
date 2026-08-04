-- =====================================================================
-- EquipmentWiki — Migration 0003
-- Search indexes
--
-- 设计说明：
-- - 等值/前缀匹配（category、manufacturer、name 前缀）由 B-tree 索引覆盖
--   （0001 已建 equipment.name / category / manufacturer）。
-- - 模糊匹配（ILIKE '%kw%'）使用 pg_trgm 的 GIN 索引加速，
--   并预留 PostgreSQL Full Text Search（tsvector + GIN）升级路径：
--   只需在此基础上增加 tsvector 列与表达式索引，无需改动查询结构。
-- =====================================================================

-- pg_trgm 是 PostgreSQL 自带 contrib 扩展（trusted，普通用户可创建）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------- equipment ----------
-- 型号等值/前缀匹配
CREATE INDEX idx_equipment_model ON equipment (model);

-- 名称/型号/厂家模糊搜索（ILIKE '%kw%'）
CREATE INDEX idx_equipment_trgm
    ON equipment USING gin (name gin_trgm_ops, model gin_trgm_ops, manufacturer gin_trgm_ops);

-- ---------- faults ----------
-- 故障标题/现象/解决方案模糊搜索
CREATE INDEX idx_faults_trgm
    ON faults USING gin (title gin_trgm_ops, symptom gin_trgm_ops, solution gin_trgm_ops);

-- ---------- documents ----------
-- 资料标题/描述模糊搜索
CREATE INDEX idx_documents_trgm
    ON documents USING gin (title gin_trgm_ops, description gin_trgm_ops);
