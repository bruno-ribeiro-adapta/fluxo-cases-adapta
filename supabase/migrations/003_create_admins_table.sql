-- =============================================================
-- Migration 003 — Tabela de admins autorizados
-- =============================================================

CREATE TABLE admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  user_id     UUID,        -- ID do usuário no Supabase Auth
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT         -- email de quem adicionou
);

-- Apenas service_role acessa esta tabela (sem policies públicas)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
