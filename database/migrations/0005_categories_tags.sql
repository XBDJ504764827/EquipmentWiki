-- =====================================================================
-- EquipmentWiki — Migration 0005
-- Category & tag system
--
-- 1. equipment_categories: 无限级分类树（自引用 parent_id）
-- 2. tags / equipment_tags: 设备标签（多对多）
-- 3. equipment: 新增 category_id 外键，迁移旧 category 字符串数据后删除该列
-- =====================================================================

-- ---------- 分类表（无限级，自引用） ----------
CREATE TABLE equipment_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    parent_id   BIGINT       REFERENCES equipment_categories (id) ON DELETE CASCADE,
    description TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 按父分类查询子分类
CREATE INDEX idx_equipment_categories_parent ON equipment_categories (parent_id);

-- ---------- 标签表 ----------
CREATE TABLE tags (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------- 设备-标签关联（多对多） ----------
CREATE TABLE equipment_tags (
    equipment_id BIGINT NOT NULL REFERENCES equipment (id) ON DELETE CASCADE,
    tag_id       BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (equipment_id, tag_id)
);

-- 按标签反查设备
CREATE INDEX idx_equipment_tags_tag ON equipment_tags (tag_id);

-- ---------- equipment: 分类关联 ----------
ALTER TABLE equipment
    ADD COLUMN category_id BIGINT REFERENCES equipment_categories (id) ON DELETE SET NULL;

-- 旧数据兼容：把现有 category 字符串迁移为分类记录
INSERT INTO equipment_categories (name)
SELECT DISTINCT category FROM equipment WHERE category <> '';

UPDATE equipment e
SET category_id = c.id
FROM equipment_categories c
WHERE c.name = e.category;

-- 移除旧的字符串分类列
ALTER TABLE equipment DROP COLUMN category;

-- 设备按分类查询
CREATE INDEX idx_equipment_category_id ON equipment (category_id);
