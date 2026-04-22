import type { N8nWebhookPayload } from '@/types/depoimentos'

export async function sendToN8n(payload: N8nWebhookPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL

  if (!webhookUrl) {
    throw new Error('Variável N8N_WEBHOOK_URL não configurada.')
  }

  console.log(`[n8n] Enviando case ${payload.case_id} para o n8n...`)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '(sem corpo)')
    console.error(`[n8n] Webhook retornou ${response.status}: ${body}`)
    throw new Error(`n8n retornou status ${response.status}`)
  }

  console.log(`[n8n] Case ${payload.case_id} enviado com sucesso.`)
}

export function buildN8nPayload(
  caseId: string,
  formData: {
    client_name: string
    role_company: string
    industry: string
    youtube_url: string
    quote_description: string
    tag: string
  },
  callbackBaseUrl: string
): N8nWebhookPayload {
  return {
    case_id: caseId,
    ...formData,
    callback_url: `${callbackBaseUrl}/api/n8n/callback`,
  }
}

export function validateN8nCallbackSecret(headerSecret: string | null): boolean {
  const expected = process.env.N8N_CALLBACK_SECRET
  if (!expected) {
    console.warn('[n8n] N8N_CALLBACK_SECRET não configurado — callbacks não autenticados!')
    return false
  }
  return headerSecret === expected
}
