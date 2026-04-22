// =============================================================
// Tipos centrais do pipeline de depoimentos
// =============================================================

export type DepoimentoStatus =
  | 'pending'
  | 'sent_to_n8n'
  | 'processing'
  | 'ready_to_publish'
  | 'publishing'
  | 'published'
  | 'error'

export interface FormattedContentSection {
  type: 'paragraph' | 'heading' | 'list'
  text?: string
  items?: string[]
}

export interface FormattedContent {
  sections?: FormattedContentSection[]
  markdown?: string
}

// Linha completa da tabela `depoimentos` no Supabase
export interface DepoimentoRow {
  id: string
  created_at: string
  updated_at: string
  status: DepoimentoStatus
  error_message: string | null

  // Dados do formulário
  client_name: string
  role_company: string
  industry: string
  youtube_url: string
  quote_description: string
  tag: string | null

  // Dados do n8n
  raw_transcript: string | null
  generated_quote: string | null
  quote_timestamp: string | null
  formatted_content: FormattedContent | null
  seo_title: string | null
  seo_description: string | null

  // Dados do Framer
  framer_item_id: string | null
  framer_slug: string | null
  framer_last_published_at: string | null
  published_url: string | null

  // Auditoria
  n8n_payload: Record<string, unknown> | null
  n8n_response: Record<string, unknown> | null
}

export interface DepoimentoFormPayload {
  client_name: string
  role_company: string
  industry: string
  youtube_url: string
  quote_description: string
  tag: string
}

// O que o n8n devolve no callback
export interface N8nCallbackPayload {
  case_id: string
  raw_transcript?: string
  generated_quote?: string
  quote_timestamp?: string
  formatted_content?: FormattedContent
  seo_title?: string
  seo_description?: string
  status: 'ready_to_publish' | 'error'
  error_message?: string
}

// O que é enviado ao n8n via webhook
export interface N8nWebhookPayload {
  case_id: string
  client_name: string
  role_company: string
  industry: string
  youtube_url: string
  quote_description: string
  tag: string
  callback_url: string
}
