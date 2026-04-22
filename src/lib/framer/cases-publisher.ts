import { connectToFramer, getCollectionByName, publishAndDeploy } from './client'
import { buildCaseFieldMap, buildFramerItemFromCase } from './cases-mapper'
import { getCaseById, markCaseAsPublishing, markCaseAsPublished, markCaseAsError } from '@/lib/supabase/cases'
import type { CaseRow } from '@/types/cases'
import type { Collection, Framer } from 'framer-api'

async function processSingleCase(
  caseRow: CaseRow,
  collection: Collection,
  fieldMap: Map<string, string>
): Promise<void> {
  console.log(`[cases-publisher] Processando case ${caseRow.id} (${caseRow.titulo_case})...`)

  await markCaseAsPublishing(caseRow.id)

  const { slug, fieldData } = buildFramerItemFromCase(caseRow, fieldMap)

  const existingItems = await collection.getItems()
  let framerItemId: string | null = null

  if (caseRow.framer_item_id) {
    const byId = existingItems.find((item) => item.id === caseRow.framer_item_id)
    if (byId) {
      framerItemId = byId.id
      console.log(`[cases-publisher] Atualizando item existente por ID: ${framerItemId}`)
    }
  }

  if (!framerItemId) {
    const bySlug = existingItems.find((item) => item.slug === slug)
    if (bySlug) {
      framerItemId = bySlug.id
      console.log(`[cases-publisher] Slug "${slug}" já existe. Atualizando...`)
    }
  }

  if (framerItemId) {
    await collection.addItems([{ id: framerItemId, slug, fieldData }])
  } else {
    console.log(`[cases-publisher] Criando novo item. Slug: ${slug}`)
    await collection.addItems([{ slug, fieldData }])
    const afterCreate = await collection.getItems()
    const created = afterCreate.find((item) => item.slug === slug)
    if (!created) throw new Error(`Item "${slug}" não encontrado após criação.`)
    framerItemId = created.id
  }

  console.log(`[cases-publisher] Item sincronizado. Framer ID: ${framerItemId}`)

  await markCaseAsPublished(caseRow.id, {
    framer_item_id: framerItemId,
    framer_slug: slug,
    framer_last_published_at: new Date().toISOString(),
    published_url: null,
  })
}

export async function publishCaseById(id: string): Promise<void> {
  const collectionName = process.env.FRAMER_CASES_COLLECTION_NAME
  if (!collectionName) throw new Error('FRAMER_CASES_COLLECTION_NAME não configurada.')

  const caseRow = await getCaseById(id)
  const framer = await connectToFramer()

  try {
    const collection = await getCollectionByName(framer, collectionName)
    const fields = await collection.getFields()
    fields.forEach(f => console.log(`[cases-publisher] Campo: "${f.name}" | tipo: "${f.type}"`))
    const fieldMap = await buildCaseFieldMap(collection)

    await processSingleCase(caseRow, collection, fieldMap)

    console.log('[cases-publisher] Publicando e fazendo deploy no Framer...')
    const publishedUrl = await publishAndDeploy(framer)
    console.log(`[cases-publisher] Deploy concluído. URL: ${publishedUrl ?? '(não disponível)'}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markCaseAsError(id, message)
    throw err
  } finally {
    await framer.disconnect()
  }
}
