#!/usr/bin/env tsx

import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Carrega .env.local manualmente (dotenv/config carrega apenas .env por padrão)
try {
  const envLocal = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envLocal.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
} catch {
  // .env.local não encontrado — ok se variáveis já estiverem no ambiente
}

import { publishReadyDepoimentos } from '../src/lib/framer/publisher.ts'

async function main() {
  console.log('=== publish-depoimentos ===')
  console.log(`Horário: ${new Date().toISOString()}`)
  console.log('')

  try {
    const { processed, errors } = await publishReadyDepoimentos()

    console.log('')
    console.log(`Resultado: ${processed} publicado(s), ${errors} erro(s)`)

    if (errors > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Erro fatal no publish-depoimentos:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
