export type BusinessCaseStatus =
  | 'draft'
  | 'transcribing'
  | 'generating'
  | 'ready_to_review'
  | 'publishing'
  | 'published'
  | 'error'

export interface CaseRow {
  id: string
  created_at: string
  updated_at: string
  status: BusinessCaseStatus
  error_message: string | null

  // Dados do formulário
  titulo_case: string
  nome_empresa: string
  localizacao: string
  setor_empresa: string
  tamanho_empresa: string
  youtube_url: string

  // Arquivos
  logo_url: string | null
  logo_path: string | null
  thumb_url: string | null
  thumb_path: string | null

  // Conteúdo gerado pela IA
  transcript: string | null
  desafio: string | null
  resultado: string | null
  content: string | null

  // Framer
  framer_item_id: string | null
  framer_slug: string | null
  framer_last_published_at: string | null
  published_url: string | null

  // Auditoria
  assemblyai_transcript_id: string | null
  n8n_response: Record<string, unknown> | null
}

export interface CaseFormPayload {
  titulo_case: string
  nome_empresa: string
  localizacao: string
  setor_empresa: string
  tamanho_empresa: string
  youtube_url: string
}

// O que o n8n devolve no callback do case
export interface CaseN8nCallbackPayload {
  case_id: string
  status: 'ready_to_review' | 'error'
  desafio?: string
  resultado?: string
  content?: string
  error_message?: string
}

// Campos editáveis pelo admin antes de publicar
export interface CaseReviewPayload {
  desafio: string
  resultado: string
  content: string
}
