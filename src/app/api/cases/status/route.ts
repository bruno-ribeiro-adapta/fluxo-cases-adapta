import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { getCaseById } from '@/lib/supabase/cases'

export async function GET(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const case_id = request.nextUrl.searchParams.get('case_id')
  if (!case_id) return NextResponse.json({ error: 'case_id obrigatório.' }, { status: 400 })

  try {
    const row = await getCaseById(case_id)
    return NextResponse.json({
      status: row.status,
      error_message: row.error_message,
      framer_slug: row.framer_slug,
      published_url: row.published_url,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
