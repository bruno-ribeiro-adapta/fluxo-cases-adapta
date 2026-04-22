#!/usr/bin/env tsx
/**
 * Cria o primeiro administrador no Supabase Auth e na tabela admins.
 *
 * Uso:
 *   npx tsx scripts/create-first-admin.mts <email> <senha>
 *
 * Exemplo:
 *   npx tsx scripts/create-first-admin.mts lucas.andrade@adapta.org MinhaS3nha!
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Carrega .env.local
try {
  const envLocal = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envLocal.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = value
  }
} catch { /* .env.local não encontrado */ }

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Uso: npx tsx scripts/create-first-admin.mts <email> <senha>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Criando admin: ${email}`)

  // Verifica se já existe na tabela admins
  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    console.log('Este email já está registrado como administrador.')
    process.exit(0)
  }

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Erro ao criar usuário no Auth:', authError.message)
    process.exit(1)
  }

  console.log(`Usuário criado no Auth: ${authData.user.id}`)

  // Insere na tabela admins
  const { error: dbError } = await supabase.from('admins').insert({
    email,
    user_id: authData.user.id,
    created_by: 'script',
  })

  if (dbError) {
    console.error('Erro ao registrar na tabela admins:', dbError.message)
    process.exit(1)
  }

  console.log('')
  console.log('Admin criado com sucesso!')
  console.log(`  Email: ${email}`)
  console.log(`  Senha: ${password}`)
}

main()
