-- =====================================================================
-- EquipmentWiki — Migration 0006
-- Maintenance knowledge articles
--
-- 网页形式的维修知识内容：维修教程 / 操作指南 / 维护教程 / 维修经验。
-- 正文使用 Markdown 存储，前端渲染 HTML。
-- =====================================================================

CREATE TABLE articles (
    id           BIGSERIAL PRIMARY KEY,
    -- 关联设备（可空：通用知识不绑定具体设备；删设备后置空）
    equipment_id BIGINT       REFERENCES equipment (id) ON DELETE SET NULL,
    title        VARCHAR(255) NOT NULL,
    -- URL 路径（SEO），如 fx5u-communication-error
    slug         VARCHAR(255) NOT NULL UNIQUE,
    summary      TEXT         NOT NULL DEFAULT '',
    -- Markdown 正文
    content      TEXT         NOT NULL DEFAULT '',
    cover_image  TEXT,
    -- 文章类型：repair / guide / maintenance / experience / other
    type         VARCHAR(20)  NOT NULL DEFAULT 'other',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_articles_type
        CHECK (type IN ('repair', 'guide', 'maintenance', 'experience', 'other'))
);

-- 按设备查文章
CREATE INDEX idx_articles_equipment_id ON articles (equipment_id);

-- 按类型筛选
CREATE INDEX idx_articles_type ON articles (type);

-- 标题/摘要/正文模糊搜索（pg_trgm，与搜索系统一致）
CREATE INDEX idx_articles_trgm
    ON articles USING gin (title gin_trgm_ops, summary gin_trgm_ops, content gin_trgm_ops);
