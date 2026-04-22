-- =============================================================
-- Migration 001 — Tabela principal do pipeline de cases
-- =============================================================

-- Enum de status que reflete cada etapa do pipeline
CREATE TYPE case_status AS ENUM (
  'pending',           -- Recém-criado pelo formulário
  'sent_to_n8n',       -- Enviado ao n8n para processamento
  'processing',        -- n8n está processando
  'ready_to_publish',  -- n8n devolveu dados; pronto para publicar
  'publishing',        -- Publisher Node.js está enviando ao Framer
  'published',         -- Publicado com sucesso no Framer
  'error'              -- Falha em alguma etapa (ver error_message)
);

CREATE TABLE IF NOT EXISTS cases (
  -- Identificação
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Controle de pipeline
  status                case_status NOT NULL DEFAULT 'pending',
  error_message         TEXT,

  -- Dados do formulário (preenchidos pelo usuário)
  client_name           TEXT NOT NULL,
  role_company          TEXT NOT NULL,
  industry              TEXT NOT NULL,
  youtube_url           TEXT NOT NULL,
  quote_description     TEXT NOT NULL,

  -- Dados processados pelo n8n
  raw_transcript        TEXT,
  generated_quote       TEXT,
  quote_timestamp       TEXT,          -- ex: "02:34" — timestamp do trecho no vídeo
  formatted_content     JSONB,         -- Estrutura rica para o CMS (ver nota abaixo)
  seo_title             TEXT,
  seo_description       TEXT,

  -- Dados de publicação no Framer
  framer_item_id        TEXT,
  framer_slug           TEXT,
  framer_last_published_at TIMESTAMPTZ,
  published_url         TEXT,

  -- Payloads brutos para auditoria/debug
  n8n_payload           JSONB,         -- O que foi enviado ao n8n
  n8n_response          JSONB          -- O que o n8n devolveu
);

-- Nota sobre formatted_content:
-- Armazenado como JSONB para suportar estrutura rica (blocos de texto, listas, etc.)
-- compatível com o CMS do Framer. O publisher converte para o formato esperado pela API.
-- Estrutura esperada: { "sections": [{ "type": "paragraph", "text": "..." }] }
-- Se o n8n devolver markdown puro, salvar como { "markdown": "..." }

-- Índices úteis para o pipeline
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_created_at ON cases (created_at DESC);
CREATE INDEX idx_cases_framer_item_id ON cases (framer_item_id) WHERE framer_item_id IS NOT NULL;

-- Trigger para manter updated_at sempre atualizado
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: habilitar mas bloquear acesso público por padrão
-- O frontend usa a anon key apenas para INSERT (criar case via formulário)
-- Toda leitura/atualização de pipeline usa a service_role key no servidor
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Permite que usuários anônimos criem cases (formulário público)
CREATE POLICY "allow_anon_insert" ON cases
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Leitura e updates são feitos apenas pelo service_role (sem policy pública)
-- O service_role bypassa RLS automaticamente
