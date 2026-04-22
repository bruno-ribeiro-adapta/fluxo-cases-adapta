import { createServerClient } from './client'
import type { CaseRow, BusinessCaseStatus, CaseN8nCallbackPayload, CaseReviewPayload } from '@/types/cases'

export async function createCase(data: {
  titulo_case: string
  nome_empresa: string
  localizacao: string
  setor_empresa: string
  tamanho_empresa: string
  youtube_url: string
  pequena_descricao: string
}): Promise<CaseRow> {
  const supabase = createServerClient()

  const { data: row, error } = await supabase
    .from('cases')
    .insert({ ...data, status: 'draft' })
    .select()
    .single()

  if (error) throw new Error(`Falha ao criar case: ${error.message}`)
  return row as CaseRow
}

export async function updateCaseFiles(
  id: string,
  files: { logo_url?: string; logo_path?: string; thumb_url?: string; thumb_path?: string }
): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.from('cases').update(files).eq('id', id)
  if (error) throw new Error(`Falha ao atualizar arquivos do case: ${error.message}`)
}

export async function getCaseById(id: string): Promise<CaseRow> {
  const supabase = createServerClient()

  const { data, error } = await supabase.from('cases').select('*').eq('id', id).single()
  if (error || !data) throw new Error(`Case ${id} não encontrado: ${error?.message ?? 'sem dados'}`)
  return data as CaseRow
}

export async function updateCaseStatus(
  id: string,
  status: BusinessCaseStatus,
  extra?: Partial<CaseRow>
): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.from('cases').update({ status, ...extra }).eq('id', id)
  if (error) throw new Error(`Falha ao atualizar status do case: ${error.message}`)
}

export async function applyCaseN8nCallback(payload: CaseN8nCallbackPayload): Promise<void> {
  const supabase = createServerClient()

  const updateData: Partial<CaseRow> = {
    status: payload.status,
    n8n_response: payload as unknown as Record<string, unknown>,
  }

  if (payload.desafio !== undefined) updateData.desafio = payload.desafio
  if (payload.resultado !== undefined) updateData.resultado = payload.resultado
  if (payload.content !== undefined) updateData.content = payload.content
  if (payload.error_message !== undefined) updateData.error_message = payload.error_message

  const { error } = await supabase.from('cases').update(updateData).eq('id', payload.case_id)
  if (error) throw new Error(`Falha ao aplicar callback: ${error.message}`)

  console.log(`[supabase/cases] Case ${payload.case_id} → status "${payload.status}"`)
}

export async function updateCaseReview(id: string, review: CaseReviewPayload): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.from('cases').update(review).eq('id', id)
  if (error) throw new Error(`Falha ao salvar revisão: ${error.message}`)
}

export async function getReadyToReviewCases(): Promise<CaseRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('status', 'ready_to_review')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Falha ao buscar cases: ${error.message}`)
  return (data ?? []) as CaseRow[]
}

export async function markCaseAsTranscribing(id: string, transcriptId: string): Promise<void> {
  await updateCaseStatus(id, 'transcribing', { assemblyai_transcript_id: transcriptId })
}

export async function markCaseAsGenerating(id: string): Promise<void> {
  await updateCaseStatus(id, 'generating')
}

export async function markCaseAsPublishing(id: string): Promise<void> {
  await updateCaseStatus(id, 'publishing')
}

export async function markCaseAsPublished(
  id: string,
  framerData: {
    framer_item_id: string
    framer_slug: string
    framer_last_published_at: string
    published_url: string | null
  }
): Promise<void> {
  await updateCaseStatus(id, 'published', framerData)
  console.log(`[supabase/cases] Case ${id} publicado. Framer ID: ${framerData.framer_item_id}`)
}

export async function markCaseAsError(id: string, message: string): Promise<void> {
  await updateCaseStatus(id, 'error', { error_message: message })
  console.error(`[supabase/cases] Case ${id} erro: ${message}`)
}
