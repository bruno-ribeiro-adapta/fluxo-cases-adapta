import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { markCaseAsGenerating, markCaseAsError } from '@/lib/supabase/cases'

// AssemblyAI chama este endpoint quando a transcrição termina.
// Busca o case pelo transcript_id, salva o texto e dispara o n8n.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const payload = body as {
    transcript_id?: string
    status?: string
    text?: string
    error?: string
  }

  const transcriptId = payload.transcript_id
  if (!transcriptId) {
    return NextResponse.json({ error: 'transcript_id ausente.' }, { status: 400 })
  }

  console.log(`[assemblyai/webhook] transcript_id=${transcriptId} status=${payload.status}`)

  // Localiza o case pelo transcript_id
  const supabase = createServerClient()
  const { data: caseRow, error: findError } = await supabase
    .from('cases')
    .select('id, youtube_url, titulo_case')
    .eq('assemblyai_transcript_id', transcriptId)
    .single()

  if (findError || !caseRow) {
    console.warn(`[assemblyai/webhook] Case não encontrado para transcript ${transcriptId}`)
    return NextResponse.json({ ok: true }) // responde 200 para o AssemblyAI não retentar
  }

  const caseId = caseRow.id as string

  if (payload.status === 'error') {
    await markCaseAsError(caseId, `AssemblyAI erro: ${payload.error ?? 'desconhecido'}`)
    return NextResponse.json({ ok: true })
  }

  if (payload.status !== 'completed') {
    return NextResponse.json({ ok: true }) // ainda processando
  }

  const transcript = payload.text ?? ''

  // Salva a transcrição no banco
  await supabase.from('cases').update({ transcript }).eq('id', caseId)

  // Dispara o n8n para geração de conteúdo
  const n8nUrl = process.env.N8N_CASES_WEBHOOK_URL
  if (!n8nUrl) {
    await markCaseAsError(caseId, 'N8N_CASES_WEBHOOK_URL não configurada.')
    return NextResponse.json({ ok: true })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

  markCaseAsGenerating(caseId)
    .then(() =>
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          titulo_case: caseRow.titulo_case,
          transcript,
          callback_url: `${baseUrl}/api/cases/callback`,
        }),
      })
    )
    .then((res) => {
      if (!res.ok) throw new Error(`n8n retornou ${res.status}`)
      console.log(`[assemblyai/webhook] n8n acionado para case ${caseId}`)
    })
    .catch((err) => {
      console.error(`[assemblyai/webhook] Falha ao acionar n8n para ${caseId}:`, err.message)
      markCaseAsError(caseId, `Falha ao acionar n8n: ${err.message}`)
    })

  return NextResponse.json({ ok: true })
}
