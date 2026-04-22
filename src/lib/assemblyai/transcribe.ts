const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY
const BASE_URL = 'https://api.assemblyai.com/v2'

function authHeaders() {
  if (!ASSEMBLYAI_API_KEY) throw new Error('ASSEMBLYAI_API_KEY não configurada.')
  return { authorization: ASSEMBLYAI_API_KEY, 'content-type': 'application/json' }
}

// Submete o vídeo do YouTube para transcrição e retorna o transcript_id.
// O AssemblyAI aceita URLs do YouTube diretamente.
export async function startTranscription(
  youtubeUrl: string,
  webhookUrl: string
): Promise<string> {
  const response = await fetch(`${BASE_URL}/transcript`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      audio_url: youtubeUrl,
      webhook_url: webhookUrl,
      language_code: 'pt',
      speech_model: 'best',
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`AssemblyAI erro ${response.status}: ${body}`)
  }

  const data = (await response.json()) as { id: string }
  console.log(`[assemblyai] Transcrição iniciada. ID: ${data.id}`)
  return data.id
}

export async function getTranscript(transcriptId: string): Promise<{
  status: 'queued' | 'processing' | 'completed' | 'error'
  text: string | null
  error: string | null
}> {
  const response = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
    headers: authHeaders(),
  })

  if (!response.ok) throw new Error(`AssemblyAI erro ao buscar transcrição: ${response.status}`)

  const data = await response.json() as {
    status: string
    text: string | null
    error: string | null
  }

  return {
    status: data.status as 'queued' | 'processing' | 'completed' | 'error',
    text: data.text,
    error: data.error,
  }
}
