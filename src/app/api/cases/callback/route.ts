import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyCaseN8nCallback } from '@/lib/supabase/cases'

const CallbackSchema = z.object({
  case_id: z.string().uuid('case_id deve ser UUID válido'),
  status: z.enum(['ready_to_review', 'error']),
  desafio: z.string().optional(),
  resultado: z.string().optional(),
  content: z.string().optional(),
  error_message: z.string().optional(),
})

export async function POST(request: NextRequest) {

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const parsed = CallbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  try {
    await applyCaseN8nCallback(parsed.data)
    console.log(`[api/cases/callback] Case ${parsed.data.case_id} → ${parsed.data.status}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/cases/callback] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
