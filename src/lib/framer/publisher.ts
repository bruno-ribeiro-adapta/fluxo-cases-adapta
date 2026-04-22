import { connectToFramer, getCollectionByName, publishAndDeploy } from './client'
import { buildFieldMap, buildFramerItemFromDepoimento } from './mapper'
import {
  getDepoimentoById,
  getReadyToPublishDepoimentos,
  markDepoimentoAsPublishing,
  markDepoimentoAsPublished,
  markDepoimentoAsError,
} from '@/lib/supabase/depoimentos'
import type { DepoimentoRow } from '@/types/depoimentos'
import type { Collection, Framer } from 'framer-api'

const TAGS_COLLECTION_NAME = 'Tags Filtro Depoimentos'
const TAG_FIELD_NAME = 'Tag Filtro Depoimento'

async function buildTagToItemIdMap(framer: Framer): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  let tagsCollection: Collection
  try {
    tagsCollection = await getCollectionByName(framer, TAGS_COLLECTION_NAME)
  } catch {
    console.warn(`[publisher] Collection "${TAGS_COLLECTION_NAME}" não encontrada.`)
    return map
  }

  const tagsFieldMap = await buildFieldMap(tagsCollection)
  const tagFieldId = tagsFieldMap.get(TAG_FIELD_NAME)

  if (!tagFieldId) {
    console.warn(`[publisher] Campo "${TAG_FIELD_NAME}" não encontrado.`)
    return map
  }

  const items = await tagsCollection.getItems()
  for (const item of items) {
    const entry = item.fieldData[tagFieldId] as { value?: unknown } | undefined
    if (typeof entry?.value === 'string') {
      map.set(entry.value, item.id)
    }
  }

  console.log(`[publisher] Tags carregadas: ${Array.from(map.keys()).join(', ')}`)
  return map
}

async function processSingleDepoimento(
  depoimento: DepoimentoRow,
  collection: Collection,
  fieldMap: Map<string, string>,
  tagToItemIdMap: Map<string, string>
): Promise<void> {
  console.log(`[publisher] Processando depoimento ${depoimento.id} (${depoimento.client_name})...`)

  await markDepoimentoAsPublishing(depoimento.id)

  const tagItemId = depoimento.tag ? (tagToItemIdMap.get(depoimento.tag) ?? null) : null

  if (depoimento.tag && !tagItemId) {
    console.warn(`[publisher] Tag "${depoimento.tag}" não encontrada na collection de tags.`)
  }

  const { slug, fieldData } = buildFramerItemFromDepoimento(depoimento, fieldMap, tagItemId)

  const existingItems = await collection.getItems()
  let framerItemId: string | null = null

  if (depoimento.framer_item_id) {
    const byId = existingItems.find((item) => item.id === depoimento.framer_item_id)
    if (byId) {
      framerItemId = byId.id
      console.log(`[publisher] Atualizando item existente por ID: ${framerItemId}`)
    }
  }

  if (!framerItemId) {
    const bySlug = existingItems.find((item) => item.slug === slug)
    if (bySlug) {
      framerItemId = bySlug.id
      console.log(`[publisher] Slug "${slug}" já existe. Atualizando...`)
    }
  }

  if (framerItemId) {
    await collection.addItems([{ id: framerItemId, slug, fieldData }])
  } else {
    console.log(`[publisher] Criando novo item. Slug: ${slug}`)
    await collection.addItems([{ slug, fieldData }])
    const afterCreate = await collection.getItems()
    const created = afterCreate.find((item) => item.slug === slug)
    if (!created) throw new Error(`Item "${slug}" não encontrado após criação.`)
    framerItemId = created.id
  }

  console.log(`[publisher] Item sincronizado. Framer ID: ${framerItemId}`)

  await markDepoimentoAsPublished(depoimento.id, {
    framer_item_id: framerItemId,
    framer_slug: slug,
    framer_last_published_at: new Date().toISOString(),
    published_url: null,
  })
}

async function connectAndPublishDepoimento(depoimento: DepoimentoRow): Promise<void> {
  const collectionName = process.env.FRAMER_COLLECTION_NAME
  if (!collectionName) throw new Error('FRAMER_COLLECTION_NAME não configurada.')

  const framer = await connectToFramer()

  try {
    const [collection, tagToItemIdMap] = await Promise.all([
      getCollectionByName(framer, collectionName),
      buildTagToItemIdMap(framer),
    ])

    const fieldMap = await buildFieldMap(collection)

    console.log(
      `[publisher] Collection: "${collection.name}". ` +
      `Campos: ${Array.from(fieldMap.keys()).join(', ')}`
    )

    await processSingleDepoimento(depoimento, collection, fieldMap, tagToItemIdMap)

    console.log('[publisher] Publicando e fazendo deploy no Framer...')
    const publishedUrl = await publishAndDeploy(framer)
    console.log(`[publisher] Deploy concluído. URL: ${publishedUrl ?? '(não disponível)'}`)
  } finally {
    await framer.disconnect()
  }
}

export async function publishDepoimentoById(id: string): Promise<void> {
  const depoimento = await getDepoimentoById(id)
  await connectAndPublishDepoimento(depoimento)
}

export async function publishReadyDepoimentos(): Promise<{
  processed: number
  errors: number
}> {
  console.log('[publisher] Buscando depoimentos prontos para publicar...')
  const depoimentos = await getReadyToPublishDepoimentos()

  if (depoimentos.length === 0) {
    console.log('[publisher] Nenhum depoimento pronto para publicar.')
    return { processed: 0, errors: 0 }
  }

  console.log(`[publisher] ${depoimentos.length} depoimento(s) encontrado(s). Conectando ao Framer...`)

  const collectionName = process.env.FRAMER_COLLECTION_NAME
  if (!collectionName) throw new Error('FRAMER_COLLECTION_NAME não configurada.')

  const framer = await connectToFramer()

  try {
    const [collection, tagToItemIdMap] = await Promise.all([
      getCollectionByName(framer, collectionName),
      buildTagToItemIdMap(framer),
    ])

    const fieldMap = await buildFieldMap(collection)

    let processed = 0
    let errors = 0

    for (const depoimento of depoimentos) {
      try {
        await processSingleDepoimento(depoimento, collection, fieldMap, tagToItemIdMap)
        processed++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[publisher] Erro no depoimento ${depoimento.id}: ${message}`)
        await markDepoimentoAsError(depoimento.id, message)
        errors++
      }
    }

    if (processed > 0) {
      console.log('[publisher] Publicando e fazendo deploy no Framer...')
      try {
        const publishedUrl = await publishAndDeploy(framer)
        console.log(`[publisher] Deploy concluído. URL: ${publishedUrl ?? '(não disponível)'}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[publisher] Erro no deploy: ${message}`)
      }
    }

    console.log(`[publisher] Concluído. Sucesso: ${processed} | Erros: ${errors}`)
    return { processed, errors }
  } finally {
    await framer.disconnect()
  }
}
