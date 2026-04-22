import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createCase, markCaseAsGenerating, markCaseAsError } from '@/lib/supabase/cases'
import { createAuthServerClient } from '@/lib/supabase/ssr'

const CaseSchema = z.object({
  titulo_case: z.string().min(1, 'Título do case é obrigatório'),
  nome_empresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  localizacao: z.string().min(1, 'Localização é obrigatória'),
  setor_empresa: z.string().min(1, 'Setor é obrigatório'),
  tamanho_empresa: z.string().min(1, 'Tamanho da empresa é obrigatório'),
  pequena_descricao: z.string().min(1, 'Pequena descrição é obrigatória'),
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

  const n8nUrl = process.env.N8N_CASES_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json({ error: 'Configuração de webhook ausente.' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`
  const callbackUrl = `${baseUrl}/api/cases/callback`

  // Dispara o n8n em background — ele chama callbackUrl quando terminar
  markCaseAsGenerating(newCase.id)
    .then(() =>
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          case_id: newCase.id,
          titulo_case: newCase.titulo_case,
          nome_empresa: newCase.nome_empresa,
          youtube_url: newCase.youtube_url,
          localizacao: newCase.localizacao,
          setor_empresa: newCase.setor_empresa,
          tamanho_empresa: newCase.tamanho_empresa,
          pequena_descricao: newCase.pequena_descricao,
          callback_url: callbackUrl,
        }),
      })
    )
    .then((res) => {
      if (!res.ok) throw new Error(`n8n retornou ${res.status}`)
      console.log(`[api/cases] n8n acionado para case ${newCase.id}`)
    })
    .catch((err) => {
      console.error(`[api/cases] Falha ao acionar n8n para ${newCase.id}:`, err.message)
      markCaseAsError(newCase.id, `Falha ao acionar n8n: ${err.message}`)
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
