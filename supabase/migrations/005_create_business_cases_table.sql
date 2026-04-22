-- =============================================================
-- Migration 005 — Tabela cases (estudos de caso empresariais)
-- =============================================================

CREATE TYPE business_case_status AS ENUM (
  'draft',            -- Recém-criado; arquivos enviados
  'transcribing',     -- AssemblyAI transcrevendo o vídeo
  'generating',       -- n8n gerando o conteúdo com IA
  'ready_to_review',  -- Conteúdo gerado; aguardando revisão do admin
  'publishing',       -- Sendo enviado ao Framer CMS
  'published',        -- Publicado no Framer
  'error'             -- Falha em alguma etapa
);

CREATE TABLE IF NOT EXISTS cases (
  -- Identificação
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Controle de pipeline
  status                    business_case_status NOT NULL DEFAULT 'draft',
  error_message             TEXT,

  -- Dados do formulário
  titulo_case               TEXT NOT NULL,
  nome_empresa              TEXT NOT NULL,
  localizacao               TEXT NOT NULL,
  setor_empresa             TEXT NOT NULL,
  tamanho_empresa           TEXT NOT NULL,
  youtube_url               TEXT NOT NULL,

  -- Arquivos (URLs públicas e paths internos no Storage)
  logo_url                  TEXT,
  logo_path                 TEXT,
  thumb_url                 TEXT,
  thumb_path                TEXT,

  -- Conteúdo gerado pela IA (editável pelo admin antes de publicar)
  transcript                TEXT,
  desafio                   TEXT,
  resultado                 TEXT,
  content                   TEXT,

  -- Dados de publicação no Framer
  framer_item_id            TEXT,
  framer_slug               TEXT,
  framer_last_published_at  TIMESTAMPTZ,
  published_url             TEXT,

  -- Auditoria
  assemblyai_transcript_id  TEXT,
  n8n_response              JSONB
);

CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_created_at ON cases (created_at DESC);
CREATE INDEX idx_cases_framer_item_id ON cases (framer_item_id) WHERE framer_item_id IS NOT NULL;

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
-- Leitura e escrita apenas via service_role (sem políticas públicas)

-- =============================================================
-- Bucket de Storage para logos e thumbs dos cases
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cases-media',
  'cases-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode fazer upload e leitura
CREATE POLICY "auth_upload_cases_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cases-media');

CREATE POLICY "auth_read_cases_media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cases-media');

CREATE POLICY "auth_delete_cases_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cases-media');
