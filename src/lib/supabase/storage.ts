import { createServerClient } from './client'

const BUCKET = 'cases-media'

export async function uploadCaseFile(
  caseId: string,
  field: 'logo' | 'thumb',
  file: File
): Promise<{ url: string; path: string }> {
  const supabase = createServerClient()

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${caseId}/${field}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Falha no upload de ${field}: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteCaseFile(path: string): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn(`[storage] Falha ao deletar ${path}: ${error.message}`)
}
