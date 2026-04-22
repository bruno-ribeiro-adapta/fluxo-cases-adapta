import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { createServerClient } from '@/lib/supabase/client'
import { updateCaseFiles } from '@/lib/supabase/cases'

const BUCKET = 'cases-media'
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  const { data: { user } } = await createAuthServerClient().auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 })
  }

  const caseId = formData.get('case_id')
  const field = formData.get('field') as 'logo' | 'thumb' | null
  const file = formData.get('file') as File | null

  if (!caseId || typeof caseId !== 'string') {
    return NextResponse.json({ error: 'case_id obrigatório.' }, { status: 400 })
  }
  if (field !== 'logo' && field !== 'thumb') {
    return NextResponse.json({ error: 'field deve ser "logo" ou "thumb".' }, { status: 400 })
  }
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 413 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' }, { status: 415 })
  }

  const supabase = createServerClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${caseId}/${field}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('[api/cases/upload] Erro no upload:', uploadError.message)
    return NextResponse.json({ error: 'Falha no upload.' }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = urlData.publicUrl

  await updateCaseFiles(caseId, {
    [`${field}_url`]: url,
    [`${field}_path`]: path,
  })

  return NextResponse.json({ url, path })
}
