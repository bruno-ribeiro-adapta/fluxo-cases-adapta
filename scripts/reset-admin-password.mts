#!/usr/bin/env tsx
/**
 * Redefine a senha de um admin existente.
 *
 * Uso:
 *   npx tsx scripts/reset-admin-password.mts <email> <nova-senha>
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Uso: npx tsx scripts/reset-admin-password.mts <email> <nova-senha>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data: { users }, error } = await supabase.auth.admin.listUsers()

if (error) {
  console.error('Erro ao listar usuários:', error.message)
  process.exit(1)
}

const user = users.find((u) => u.email === email)

if (!user) {
  console.error(`Usuário "${email}" não encontrado no Supabase Auth.`)
  process.exit(1)
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword,
})

if (updateError) {
  console.error('Erro ao atualizar senha:', updateError.message)
  process.exit(1)
}

console.log(`Senha de ${email} atualizada com sucesso.`)
