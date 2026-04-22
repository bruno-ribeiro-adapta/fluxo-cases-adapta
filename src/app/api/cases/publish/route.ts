import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { publishCaseById } from '@/lib/framer/cases-publisher'

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

  try {
    await publishCaseById(parsed.data.case_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/cases/publish] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
