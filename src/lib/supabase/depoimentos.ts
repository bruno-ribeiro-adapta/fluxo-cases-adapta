import { createServerClient } from './client'
import type { DepoimentoRow, DepoimentoStatus, N8nCallbackPayload } from '@/types/depoimentos'

export async function createDepoimento(data: {
  client_name: string
  role_company: string
  industry: string
  youtube_url: string
  quote_description: string
  tag: string
}): Promise<DepoimentoRow> {
  const supabase = createServerClient()

  const { data: row, error } = await supabase
    .from('depoimentos')
    .insert({ ...data, status: 'pending' })
    .select()
    .single()

  if (error) {
    console.error('[supabase] Erro ao criar depoimento:', error.message)
    throw new Error(`Falha ao criar depoimento: ${error.message}`)
  }

  return row as DepoimentoRow
}

export async function getDepoimentoById(id: string): Promise<DepoimentoRow> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('depoimentos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new Error(`Depoimento ${id} não encontrado: ${error?.message ?? 'sem dados'}`)
  }

  return data as DepoimentoRow
}

export async function updateDepoimentoStatus(
  id: string,
  status: DepoimentoStatus,
  extra?: Partial<DepoimentoRow>
): Promise<void> {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('depoimentos')
    .update({ status, ...extra })
    .eq('id', id)

  if (error) {
    console.error(`[supabase] Erro ao atualizar status do depoimento ${id}:`, error.message)
    throw new Error(`Falha ao atualizar depoimento: ${error.message}`)
  }
}

export async function applyN8nCallback(payload: N8nCallbackPayload): Promise<void> {
  const supabase = createServerClient()

  const updateData: Partial<DepoimentoRow> = {
    status: payload.status,
    n8n_response: payload as unknown as Record<string, unknown>,
  }

  if (payload.raw_transcript !== undefined) updateData.raw_transcript = payload.raw_transcript
  if (payload.generated_quote !== undefined) updateData.generated_quote = payload.generated_quote
  if (payload.quote_timestamp !== undefined) updateData.quote_timestamp = payload.quote_timestamp
  if (payload.formatted_content !== undefined) updateData.formatted_content = payload.formatted_content
  if (payload.seo_title !== undefined) updateData.seo_title = payload.seo_title
  if (payload.seo_description !== undefined) updateData.seo_description = payload.seo_description
  if (payload.error_message !== undefined) updateData.error_message = payload.error_message

  const { error } = await supabase
    .from('depoimentos')
    .update(updateData)
    .eq('id', payload.case_id)

  if (error) {
    console.error(`[supabase] Erro ao aplicar callback n8n para depoimento ${payload.case_id}:`, error.message)
    throw new Error(`Falha ao aplicar callback: ${error.message}`)
  }

  console.log(`[supabase] Depoimento ${payload.case_id} atualizado para status "${payload.status}"`)
}

export async function getReadyToPublishDepoimentos(): Promise<DepoimentoRow[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('depoimentos')
    .select('*')
    .eq('status', 'ready_to_publish')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[supabase] Erro ao buscar depoimentos prontos:', error.message)
    throw new Error(`Falha ao buscar depoimentos: ${error.message}`)
  }

  return (data ?? []) as DepoimentoRow[]
}

export async function markDepoimentoAsPublishing(id: string): Promise<void> {
  await updateDepoimentoStatus(id, 'publishing')
}

export async function markDepoimentoAsPublished(
  id: string,
  framerData: {
    framer_item_id: string
    framer_slug: string
    framer_last_published_at: string
    published_url: string | null
  }
): Promise<void> {
  await updateDepoimentoStatus(id, 'published', framerData)
  console.log(`[supabase] Depoimento ${id} marcado como publicado. Item Framer: ${framerData.framer_item_id}`)
}

export async function markDepoimentoAsError(id: string, message: string): Promise<void> {
  await updateDepoimentoStatus(id, 'error', { error_message: message })
  console.error(`[supabase] Depoimento ${id} marcado como erro: ${message}`)
}
