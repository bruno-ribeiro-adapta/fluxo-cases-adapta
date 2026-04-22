import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { createServerClient } from '@/lib/supabase/client'

const CreateAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

async function getAuthenticatedUser() {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, created_at, created_by')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ admins: data })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const parsed = CreateAdminSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { email, password } = parsed.data
  const supabase = createServerClient()

  // Verifica se já existe
  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Esse email já é administrador.' }, { status: 409 })
  }

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: `Falha ao criar usuário: ${authError.message}` }, { status: 500 })
  }

  // Registra na tabela admins
  const { data: admin, error: dbError } = await supabase
    .from('admins')
    .insert({
      email,
      user_id: authData.user.id,
      created_by: user.email,
    })
    .select()
    .single()

  if (dbError) {
    // Tenta reverter criação do Auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: `Falha ao registrar admin: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ admin }, { status: 201 })
}
