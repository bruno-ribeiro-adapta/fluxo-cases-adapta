import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { markCaseAsPublishing } from '@/lib/supabase/cases'

const Schema = z.object({
  case_id: z.string().uuid(),
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

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'case_id inválido.' }, { status: 422 })
  }

  const { case_id } = parsed.data

  try {
    await markCaseAsPublishing(case_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Dispara a Supabase Edge Function — ela roda por até 150s (gratuito),
  // suficiente para o publish completo no Framer (20-40s).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const fnUrl = `${supabaseUrl}/functions/v1/publish-case`

  fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ case_id }),
  }).catch((err) => {
    console.error('[api/cases/publish] Falha ao chamar edge function:', err instanceof Error ? err.message : err)
  })

  return NextResponse.json({ success: true })
}
