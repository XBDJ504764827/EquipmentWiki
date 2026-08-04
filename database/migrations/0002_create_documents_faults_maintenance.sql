-- =====================================================================
-- EquipmentWiki — Migration 0002
-- 1. Rename equipment.image_url -> equipment.cover_image
-- 2. Create documents / faults / maintenance tables
-- =====================================================================

-- ---------- equipment: rename cover image column ----------
ALTER TABLE equipment RENAME COLUMN image_url TO cover_image;

-- ---------- documents: equipment-related files (manual/repair/diagram/...) ----------
CREATE TABLE documents (
    id           BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT       NOT NULL REFERENCES equipment (id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    file_url     TEXT         NOT NULL,
    -- 文件类型（扩展名）：pdf / png / jpg / webp / doc / xls ...
    file_type    VARCHAR(20)  NOT NULL DEFAULT 'other',
    -- 资料分类：manual / repair / diagram / parameter / other
    category     VARCHAR(20)  NOT NULL DEFAULT 'other',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_documents_category
        CHECK (category IN ('manual', 'repair', 'diagram', 'parameter', 'other'))
);

-- 按设备查询资料的场景
CREATE INDEX idx_documents_equipment_id ON documents (equipment_id);

-- ---------- faults: fault knowledge (symptom / reason / solution) ----------
CREATE TABLE faults (
    id           BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT       NOT NULL REFERENCES equipment (id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    -- 故障现象
    symptom      TEXT         NOT NULL DEFAULT '',
    -- 故障原因
    reason       TEXT         NOT NULL DEFAULT '',
    -- 解决方案
    solution     TEXT         NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_faults_equipment_id ON faults (equipment_id);

-- ---------- maintenance: maintenance knowledge ----------
CREATE TABLE maintenance (
    id           BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT       NOT NULL REFERENCES equipment (id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL DEFAULT '',
    -- 维护周期，如：6个月 / 每周 / 5000小时
    cycle        VARCHAR(100) NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_equipment_id ON maintenance (equipment_id);
