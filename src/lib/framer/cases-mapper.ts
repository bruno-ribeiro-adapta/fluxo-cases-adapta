import type { CaseRow } from '@/types/cases'
import type { Collection, FieldDataInput } from 'framer-api'

export const FRAMER_CASE_FIELD_NAMES = {
  tituloCase:        'Titulo case',
  nomeDaEmpresa:     'Nome da Empresa',
  logoEmpresa:       'Logo Empresa',
  localizacao:       'Localização',
  setorEmpresa:      'Setor Empresa',
  tamanhoEmpresa:    'Tamanho Empresa',
  pequenaDescricao:  'Pequena Descrição',
  desafioEnfrentado: 'Desafio Enfrentado',
  resultado:         'Resultado',
  content:           'Content',
  urlVideoYoutube:   'URL Video Youtube',
  thumbCase:         'Thumb Case',
} as const

export async function buildCaseFieldMap(collection: Collection): Promise<Map<string, string>> {
  const fields = await collection.getFields()
  const map = new Map<string, string>()
  for (const field of fields) {
    map.set(field.name, field.id)
  }
  return map
}

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

export function buildFramerItemFromCase(
  caseRow: CaseRow,
  fieldMap: Map<string, string>
): { slug: string; fieldData: FieldDataInput } {
  const raw: Record<string, { type: string; value: unknown }> = {}

  function setString(key: keyof typeof FRAMER_CASE_FIELD_NAMES, value: string) {
    const fieldId = fieldMap.get(FRAMER_CASE_FIELD_NAMES[key])
    if (!fieldId) {
      console.warn(`[cases-mapper] Campo "${FRAMER_CASE_FIELD_NAMES[key]}" não encontrado.`)
      return
    }
    raw[fieldId] = { type: 'string', value }
  }

  function setFormattedText(key: keyof typeof FRAMER_CASE_FIELD_NAMES, value: string) {
    const fieldId = fieldMap.get(FRAMER_CASE_FIELD_NAMES[key])
    if (!fieldId) {
      console.warn(`[cases-mapper] Campo "${FRAMER_CASE_FIELD_NAMES[key]}" não encontrado.`)
      return
    }
    raw[fieldId] = { type: 'formattedText', value }
  }

  function setImage(key: keyof typeof FRAMER_CASE_FIELD_NAMES, url: string) {
    const fieldId = fieldMap.get(FRAMER_CASE_FIELD_NAMES[key])
    if (!fieldId) {
      console.warn(`[cases-mapper] Campo "${FRAMER_CASE_FIELD_NAMES[key]}" não encontrado.`)
      return
    }
    raw[fieldId] = { type: 'image', value: url }
  }

  setString('tituloCase',        caseRow.titulo_case)
  setString('nomeDaEmpresa',     caseRow.nome_empresa)
  setString('localizacao',       caseRow.localizacao)
  setString('setorEmpresa',      caseRow.setor_empresa)
  setString('tamanhoEmpresa',    caseRow.tamanho_empresa)
  setString('pequenaDescricao',  caseRow.pequena_descricao ?? '')
  setString('urlVideoYoutube',   caseRow.youtube_url)

  setString('desafioEnfrentado',    caseRow.desafio ?? '')
  setFormattedText('resultado',     toHtml(caseRow.resultado ?? ''))
  setFormattedText('content',       toHtml(caseRow.content ?? ''))

  if (caseRow.logo_url)  setImage('logoEmpresa', caseRow.logo_url)
  if (caseRow.thumb_url) setImage('thumbCase',   caseRow.thumb_url)

  return {
    slug: slugify(caseRow.titulo_case),
    fieldData: raw as unknown as FieldDataInput,
  }
}
