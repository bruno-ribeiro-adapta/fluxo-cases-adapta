import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createDepoimento } from '@/lib/supabase/depoimentos'
import { publishDepoimentoById } from '@/lib/framer/publisher'
import { createAuthServerClient } from '@/lib/supabase/ssr'

const QUOTE_MAX = 78

const DepoimentoSchema = z.object({
  client_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  role_company: z.string().min(1, 'Cargo/Empresa é obrigatório'),
  industry: z.string().min(1, 'Setor é obrigatório'),
  youtube_url: z
    .string()
    .url('Informe uma URL válida')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'A URL deve ser do YouTube'
    ),
  quote_description: z
    .string()
    .min(1, 'A citação é obrigatória')
    .max(QUOTE_MAX, `Máximo de ${QUOTE_MAX} caracteres`),
  tag: z.string().min(1, 'Selecione uma categoria'),
})

function wrapWithQuotes(text: string): string {
  const stripped = text.trim().replace(/^["""]+|["""]+$/g, '').trim()
  return `"${stripped}"`
}

export async function POST(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const parsed = DepoimentoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const depoimentoData = {
    ...parsed.data,
    quote_description: wrapWithQuotes(parsed.data.quote_description),
  }

  let depoimentoId: string

  try {
    const newDepoimento = await createDepoimento(depoimentoData)
    depoimentoId = newDepoimento.id
    console.log(`[api/depoimentos] Depoimento criado: ${depoimentoId}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/depoimentos] Erro ao criar depoimento:', message)
    return NextResponse.json({ error: 'Falha ao salvar o depoimento. Tente novamente.' }, { status: 500 })
  }

  try {
    await publishDepoimentoById(depoimentoId)
    console.log(`[api/depoimentos] Depoimento ${depoimentoId} publicado no Framer.`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error(`[api/depoimentos] Falha ao publicar no Framer: ${message}`)
    return NextResponse.json(
      { error: 'Depoimento salvo, mas falha ao publicar no Framer. Tente publicar novamente.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, depoimento_id: depoimentoId }, { status: 201 })
}
