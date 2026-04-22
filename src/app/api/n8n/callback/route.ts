import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyN8nCallback } from '@/lib/supabase/depoimentos'
import { validateN8nCallbackSecret } from '@/lib/n8n/webhook'

const CallbackSchema = z.object({
  case_id: z.string().uuid('case_id deve ser um UUID válido'),
  status: z.enum(['ready_to_publish', 'error']),
  raw_transcript: z.string().optional(),
  generated_quote: z.string().optional(),
  quote_timestamp: z.string().optional(),
  formatted_content: z
    .object({
      sections: z
        .array(
          z.object({
            type: z.enum(['paragraph', 'heading', 'list']),
            text: z.string().optional(),
            items: z.array(z.string()).optional(),
          })
        )
        .optional(),
      markdown: z.string().optional(),
    })
    .optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  error_message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Validação do secret de autenticação
  const secret = request.headers.get('x-webhook-secret')
  if (!validateN8nCallbackSecret(secret)) {
    console.warn('[api/n8n/callback] Tentativa de callback com secret inválido.')
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

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
    await applyN8nCallback(parsed.data)
    console.log(`[api/n8n/callback] Callback aplicado para case ${parsed.data.case_id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[api/n8n/callback] Erro ao aplicar callback:', message)
    return NextResponse.json({ error: 'Falha ao atualizar o case.' }, { status: 500 })
  }
}
