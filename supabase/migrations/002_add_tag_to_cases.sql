-- =============================================================
-- Migration 002 — Adiciona coluna tag à tabela cases
-- =============================================================

ALTER TABLE cases ADD COLUMN tag TEXT;
