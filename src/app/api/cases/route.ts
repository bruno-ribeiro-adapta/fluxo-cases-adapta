import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCase, markCaseAsTranscribing, markCaseAsError } from '@/lib/supabase/cases'
import { startTranscription } from '@/lib/assemblyai/transcribe'
import { createAuthServerClient } from '@/lib/supabase/ssr'

const CaseSchema = z.object({
  titulo_case: z.string().min(1, 'Título do case é obrigatório'),
  nome_empresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  localizacao: z.string().min(1, 'Localização é obrigatória'),
  setor_empresa: z.string().min(1, 'Setor é obrigatório'),
  tamanho_empresa: z.string().min(1, 'Tamanho da empresa é obrigatório'),
  youtube_url: z
    .string()
    .url('Informe uma URL válida')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'A URL deve ser do YouTube'
    ),
})

export async function POST(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const parsed = CaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const newCase = await createCase(parsed.data).catch((err) => {
    console.error('[api/cases] Erro ao criar case:', err.message)
    return null
  })

  if (!newCase) {
    return NextResponse.json({ error: 'Falha ao salvar o case.' }, { status: 500 })
  }

  // Inicia transcrição em background — não bloqueia a resposta
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  const assemblyWebhook = `${baseUrl}/api/assemblyai/webhook`

  startTranscription(newCase.youtube_url, assemblyWebhook)
    .then((transcriptId) => markCaseAsTranscribing(newCase.id, transcriptId))
    .catch((err) => {
      console.error(`[api/cases] Erro ao iniciar transcrição para ${newCase.id}:`, err.message)
      markCaseAsError(newCase.id, `Falha na transcrição: ${err.message}`)
    })

  return NextResponse.json({ success: true, case_id: newCase.id }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { createServerClient } = await import('@/lib/supabase/client')
  const supabase = createServerClient()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase.from('cases').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
