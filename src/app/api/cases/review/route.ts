import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateCaseReview } from '@/lib/supabase/cases'
import { createAuthServerClient } from '@/lib/supabase/ssr'

const ReviewSchema = z.object({
  case_id: z.string().uuid(),
  desafio: z.string().min(1, 'Desafio é obrigatório'),
  resultado: z.string().min(1, 'Resultado é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
})

export async function PATCH(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const parsed = ReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { case_id, ...review } = parsed.data

  try {
    await updateCaseReview(case_id, review)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
