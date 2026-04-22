import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { publishReadyDepoimentos } from '@/lib/framer/publisher'

export async function POST(_request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  try {
    const result = await publishReadyDepoimentos()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/admin/publish] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
