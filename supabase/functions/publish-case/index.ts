// Supabase Edge Function — Deno runtime, até 150s de timeout (gratuito)
// Roda o publish no Framer sem depender do limite de 10s do Vercel Hobby
import { connect } from 'npm:framer-api'
import { createClient } from 'npm:@supabase/supabase-js'

const FIELD_NAMES = {
  tituloCase:        'Titulo case',
  nomeDaEmpresa:     'Nome da Empresa',
  logoEmpresa:       'Logo Empresa',
  localizacao:       'Localização',
  setorEmpresa:      'Setor Empresa',
  tamanhoEmpresa:    'Tamanho Empresa',
  desafioEnfrentado: 'Desafio Enfrentado',
  resultado:         'Resultado',
  content:           'Content',
  urlVideoYoutube:   'URL Video Youtube',
  thumbCase:         'Thumb Case',
} as const

function toHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let case_id: string
  try {
    const body = await req.json()
    case_id = body.case_id
    if (!case_id) throw new Error('case_id obrigatório')
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const framerApiKey = Deno.env.get('FRAMER_API_KEY')!
  const framerProjectUrl = Deno.env.get('FRAMER_PROJECT_URL')!
  const collectionName = Deno.env.get('FRAMER_CASES_COLLECTION_NAME')!

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  async function setStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    await supabase.from('cases').update({ status, ...extra }).eq('id', id)
  }

  // Busca o case
  const { data: caseRow, error: fetchErr } = await supabase
    .from('cases').select('*').eq('id', case_id).single()

  if (fetchErr || !caseRow) {
    return jsonResponse({ error: `Case ${case_id} não encontrado` }, 404)
  }

  await setStatus(case_id, 'publishing')

  const framer = await connect(framerProjectUrl, framerApiKey)

  try {
    // Localiza a collection
    const collections = await framer.getCollections()
    const collection = collections.find(
      // deno-lint-ignore no-explicit-any
      (c: any) => c.name.toLowerCase() === collectionName.toLowerCase()
    )
    if (!collection) throw new Error(`Collection "${collectionName}" não encontrada`)

    // Monta o mapa campo → ID
    const fields = await collection.getFields()
    // deno-lint-ignore no-explicit-any
    const fieldMap = new Map<string, string>(fields.map((f: any) => [f.name, f.id]))

    // deno-lint-ignore no-explicit-any
    const raw: Record<string, { type: string; value: unknown }> = {}

    function setString(name: string, value: string) {
      const id = fieldMap.get(name); if (id) raw[id] = { type: 'string', value }
    }
    function setFormattedText(name: string, value: string) {
      const id = fieldMap.get(name); if (id) raw[id] = { type: 'formattedText', value }
    }
    function setImage(name: string, url: string) {
      const id = fieldMap.get(name); if (id) raw[id] = { type: 'image', value: url }
    }

    setString(FIELD_NAMES.tituloCase,        caseRow.titulo_case)
    setString(FIELD_NAMES.nomeDaEmpresa,     caseRow.nome_empresa)
    setString(FIELD_NAMES.localizacao,       caseRow.localizacao)
    setString(FIELD_NAMES.setorEmpresa,      caseRow.setor_empresa)
    setString(FIELD_NAMES.tamanhoEmpresa,    caseRow.tamanho_empresa)
    setString(FIELD_NAMES.urlVideoYoutube,   caseRow.youtube_url)
    setString(FIELD_NAMES.desafioEnfrentado, caseRow.desafio ?? '')
    setFormattedText(FIELD_NAMES.resultado,  toHtml(caseRow.resultado ?? ''))
    setFormattedText(FIELD_NAMES.content,    toHtml(caseRow.content ?? ''))
    if (caseRow.logo_url)  setImage(FIELD_NAMES.logoEmpresa, caseRow.logo_url)
    if (caseRow.thumb_url) setImage(FIELD_NAMES.thumbCase,   caseRow.thumb_url)

    const slug = slugify(caseRow.titulo_case)

    // Cria ou atualiza o item
    // deno-lint-ignore no-explicit-any
    const existingItems: any[] = await collection.getItems()
    let framerItemId: string | null = null

    if (caseRow.framer_item_id) {
      // deno-lint-ignore no-explicit-any
      const byId = existingItems.find((item: any) => item.id === caseRow.framer_item_id)
      if (byId) framerItemId = byId.id
    }
    if (!framerItemId) {
      // deno-lint-ignore no-explicit-any
      const bySlug = existingItems.find((item: any) => item.slug === slug)
      if (bySlug) framerItemId = bySlug.id
    }

    if (framerItemId) {
      await collection.addItems([{ id: framerItemId, slug, fieldData: raw }])
    } else {
      await collection.addItems([{ slug, fieldData: raw }])
      // deno-lint-ignore no-explicit-any
      const afterCreate: any[] = await collection.getItems()
      // deno-lint-ignore no-explicit-any
      const created = afterCreate.find((item: any) => item.slug === slug)
      if (!created) throw new Error(`Item "${slug}" não encontrado após criação`)
      framerItemId = created.id
    }

    // Publica e faz deploy do site Framer
    // deno-lint-ignore no-explicit-any
    const publishResult: any = await framer.publish()
    const deploymentId = publishResult.deployment.id
    // deno-lint-ignore no-explicit-any
    const hostnames: any[] = await framer.deploy(deploymentId)
    // deno-lint-ignore no-explicit-any
    const productionHost = hostnames.find((h: any) => h.type === 'default' || h.type === 'custom')
    const publishedUrl = productionHost?.hostname ?? null

    await setStatus(case_id, 'published', {
      framer_item_id: framerItemId,
      framer_slug: slug,
      framer_last_published_at: new Date().toISOString(),
      published_url: publishedUrl,
    })

    console.log(`[publish-case] Case ${case_id} publicado. Framer ID: ${framerItemId}`)
    return jsonResponse({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[publish-case] Erro no case ${case_id}:`, message)
    await setStatus(case_id, 'error', { error_message: message })
    return jsonResponse({ error: message }, 500)
  } finally {
    await framer.disconnect()
  }
})
