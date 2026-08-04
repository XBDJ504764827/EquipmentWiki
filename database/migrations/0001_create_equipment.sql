-- =====================================================================
-- EquipmentWiki — Migration 0001
-- Create equipment table
-- =====================================================================

CREATE TABLE equipment (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255)  NOT NULL,
    model        VARCHAR(255)  NOT NULL,
    manufacturer VARCHAR(255)  NOT NULL,
    category     VARCHAR(100)  NOT NULL,
    description  TEXT          NOT NULL DEFAULT '',
    image_url    TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes for common query patterns:
-- 1. list by category
CREATE INDEX idx_equipment_category ON equipment (category);

-- 2. list by manufacturer
CREATE INDEX idx_equipment_manufacturer ON equipment (manufacturer);

-- 3. search by name prefix (also supports ILIKE 'foo%' lookups)
CREATE INDEX idx_equipment_name ON equipment (name);
