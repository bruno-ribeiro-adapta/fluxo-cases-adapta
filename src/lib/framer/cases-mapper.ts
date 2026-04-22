import type { CaseRow } from '@/types/cases'
import type { Collection, FieldDataInput } from 'framer-api'

export const FRAMER_CASE_FIELD_NAMES = {
  tituloCase:       'Titulo Case',
  nomeDaEmpresa:    'Nome da Empresa',
  logoEmpresa:      'Logo Empresa',
  localizacao:      'Localização',
  setorEmpresa:     'Setor Empresa',
  tamanhoEmpresa:   'Tamanho Empresa',
  desafioEnfrentado:'Desafio Enfrentado',
  resultado:        'Resultado',
  content:          'Content',
  urlVideoYoutube:  'URL Video Youtube',
  thumbCase:        'Thumb Case',
} as const

export async function buildCaseFieldMap(collection: Collection): Promise<Map<string, string>> {
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

export function buildFramerItemFromCase(
  caseRow: CaseRow,
  fieldMap: Map<string, string>
): { slug: string; fieldData: FieldDataInput } {
  const raw: Record<string, { type: string; value: unknown }> = {}

  function setField(
    key: keyof typeof FRAMER_CASE_FIELD_NAMES,
    type: 'string',
    value: string
  ) {
    const fieldName = FRAMER_CASE_FIELD_NAMES[key]
    const fieldId = fieldMap.get(fieldName)
    if (!fieldId) {
      console.warn(`[cases-mapper] Campo "${fieldName}" não encontrado. Ignorando.`)
      return
    }
    raw[fieldId] = { type, value }
  }

  setField('tituloCase',        'string', caseRow.titulo_case)
  setField('nomeDaEmpresa',     'string', caseRow.nome_empresa)
  setField('localizacao',       'string', caseRow.localizacao)
  setField('setorEmpresa',      'string', caseRow.setor_empresa)
  setField('tamanhoEmpresa',    'string', caseRow.tamanho_empresa)
  setField('urlVideoYoutube',   'string', caseRow.youtube_url)
  setField('desafioEnfrentado', 'string', caseRow.desafio ?? '')
  setField('resultado',         'string', caseRow.resultado ?? '')
  setField('content',           'string', caseRow.content ?? '')

  if (caseRow.logo_url) {
    setField('logoEmpresa', 'string', caseRow.logo_url)
  }
  if (caseRow.thumb_url) {
    setField('thumbCase', 'string', caseRow.thumb_url)
  }

  return {
    slug: slugify(caseRow.titulo_case),
    fieldData: raw as unknown as FieldDataInput,
  }
}
