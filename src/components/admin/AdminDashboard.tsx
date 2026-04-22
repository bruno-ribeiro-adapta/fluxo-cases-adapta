'use client'

import { useState } from 'react'

interface Admin {
  id: string
  email: string
  created_at: string
  created_by: string | null
}

interface Props {
  initialAdmins: Admin[]
  currentUserEmail: string
}

function Initials({ email }: { email: string }) {
  const parts = email.split('@')[0].split(/[._-]/)
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
  return (
    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-brand-700">{letters}</span>
    </div>
  )
}

export default function AdminDashboard({ initialAdmins, currentUserEmail }: Props) {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [formState, setFormState] = useState<
    | { type: 'idle' }
    | { type: 'loading' }
    | { type: 'success' }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormState({ type: 'loading' })

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setFormState({ type: 'error', message: data.error ?? 'Erro ao adicionar.' })
      return
    }

    setAdmins((prev) => [...prev, data.admin])
    setEmail('')
    setPassword('')
    setFormState({ type: 'success' })
    setTimeout(() => setFormState({ type: 'idle' }), 2500)
  }

  async function handleRemove(id: string, adminEmail: string) {
    if (!confirm(`Remover ${adminEmail} como administrador?`)) return
    setRemoving(id)

    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok) {
      alert(data.error ?? 'Erro ao remover.')
      setRemoving(null)
      return
    }

    setAdmins((prev) => prev.filter((a) => a.id !== id))
    setRemoving(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-adapta-100">
          <h2 className="text-sm font-semibold text-adapta-900">Administradores ativos</h2>
          <p className="text-xs text-adapta-500 mt-0.5">{admins.length} conta{admins.length !== 1 ? 's' : ''} com acesso</p>
        </div>

        {admins.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-adapta-400">Nenhum administrador cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-adapta-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-adapta-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Initials email={admin.email} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-adapta-900 truncate">
                      {admin.email}
                      {admin.email === currentUserEmail && (
                        <span className="ml-2 text-[10px] font-semibold text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">Você</span>
                      )}
                    </p>
                    <p className="text-xs text-adapta-400 mt-0.5">
                      Adicionado em {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                      {admin.created_by ? ` · por ${admin.created_by}` : ''}
                    </p>
                  </div>
                </div>

                {admin.email !== currentUserEmail && (
                  <button
                    onClick={() => handleRemove(admin.id, admin.email)}
                    disabled={removing === admin.id}
                    className="ml-4 flex-shrink-0 text-xs text-adapta-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {removing === admin.id ? 'Removendo...' : 'Remover'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulário */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-adapta-100">
          <h2 className="text-sm font-semibold text-adapta-900">Adicionar administrador</h2>
          <p className="text-xs text-adapta-500 mt-0.5">A pessoa poderá entrar e publicar depoimentos.</p>
        </div>

        <form onSubmit={handleAdd} className="px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-adapta-800">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@adapta.org"
              className="field-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-adapta-800">
              Senha inicial <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="field-input"
            />
            <p className="text-xs text-adapta-500">Compartilhe a senha com a pessoa diretamente.</p>
          </div>

          {formState.type === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {formState.message}
            </div>
          )}

          {formState.type === 'success' && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Administrador adicionado com sucesso.
            </div>
          )}

          <button
            type="submit"
            disabled={formState.type === 'loading'}
            className="btn-primary"
          >
            {formState.type === 'loading' ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Adicionando...
              </>
            ) : 'Adicionar administrador'}
          </button>
        </form>
      </div>
    </div>
  )
}
