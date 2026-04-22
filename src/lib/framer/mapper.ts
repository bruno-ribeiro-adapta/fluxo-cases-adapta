import type { DepoimentoRow } from '@/types/depoimentos'
import type { Collection, FieldDataInput } from 'framer-api'

export const FRAMER_FIELD_NAMES = {
  clientName: 'Nome Cliente',
  roleCompany: 'Cargo / Empresa',
  youtubeUrl: 'URL Video Youtube',
  quote: 'Descrição Aspas',
  tagFilter: 'Tags Filtro Depoimento',
} as const

export async function buildFieldMap(
  collection: Collection
): Promise<Map<string, string>> {
  const fields = await collection.getFields()
  const map = new Map<string, string>()
  for (const field of fields) {
    map.set(field.name, field.id)
  }
  return map
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildFramerItemFromDepoimento(
  depoimento: DepoimentoRow,
  fieldMap: Map<string, string>,
  tagItemId?: string | null
): { slug: string; fieldData: FieldDataInput } {
  const raw: Record<string, { type: string; value: unknown }> = {}

  function setField(
    configKey: keyof typeof FRAMER_FIELD_NAMES,
    type: 'string' | 'link' | 'formattedText',
    value: string
  ) {
    const fieldName = FRAMER_FIELD_NAMES[configKey]
    const fieldId = fieldMap.get(fieldName)
    if (!fieldId) {
      console.warn(`[framer/mapper] Campo "${fieldName}" não encontrado. Ignorando.`)
      return
    }
    raw[fieldId] = { type, value }
  }

  setField('clientName', 'string', depoimento.client_name)
  setField('roleCompany', 'string', depoimento.role_company)
  setField('youtubeUrl', 'string', depoimento.youtube_url)
  setField('quote', 'string', depoimento.quote_description)

  if (tagItemId) {
    const tagFieldName = FRAMER_FIELD_NAMES.tagFilter
    const tagFieldId = fieldMap.get(tagFieldName)
    if (tagFieldId) {
      raw[tagFieldId] = { type: 'collectionReference', value: tagItemId }
    } else {
      console.warn(`[framer/mapper] Campo "${tagFieldName}" não encontrado. Tag ignorada.`)
    }
  }

  return {
    slug: slugify(depoimento.client_name),
    fieldData: raw as unknown as FieldDataInput,
  }
}
