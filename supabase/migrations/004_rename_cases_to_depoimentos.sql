-- =============================================================
-- Migration 004 — Renomeia tabela cases → depoimentos
-- =============================================================

ALTER TABLE cases RENAME TO depoimentos;
ALTER INDEX idx_cases_status RENAME TO idx_depoimentos_status;
ALTER INDEX idx_cases_created_at RENAME TO idx_depoimentos_created_at;
ALTER INDEX idx_cases_framer_item_id RENAME TO idx_depoimentos_framer_item_id;
ALTER TRIGGER cases_updated_at ON depoimentos RENAME TO depoimentos_updated_at;
