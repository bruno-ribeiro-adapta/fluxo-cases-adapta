import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { createServerClient } from '@/lib/supabase/client'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data: admin, error: fetchError } = await supabase
    .from('admins')
    .select('id, email, user_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !admin) {
    return NextResponse.json({ error: 'Admin não encontrado.' }, { status: 404 })
  }

  // Impede que o admin se remova
  if (admin.email === user.email) {
    return NextResponse.json({ error: 'Você não pode remover a si mesmo.' }, { status: 400 })
  }

  // Remove da tabela admins
  await supabase.from('admins').delete().eq('id', params.id)

  // Remove do Supabase Auth se tiver user_id
  if (admin.user_id) {
    await supabase.auth.admin.deleteUser(admin.user_id)
  }

  return NextResponse.json({ success: true })
}
