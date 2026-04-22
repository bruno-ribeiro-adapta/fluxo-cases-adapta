'use client'

import { useState, useRef, useEffect } from 'react'
import type { CaseRow } from '@/types/cases'

function StatusBadge({ status }: { status: CaseRow['status'] }) {
  const map: Record<CaseRow['status'], { label: string; className: string }> = {
    draft:           { label: 'Rascunho',       className: 'bg-adapta-100 text-adapta-500' },
    transcribing:    { label: 'Transcrevendo',  className: 'bg-amber-100 text-amber-600' },
    generating:      { label: 'Gerando IA',     className: 'bg-amber-100 text-amber-600' },
    ready_to_review: { label: 'Revisar',        className: 'bg-brand-100 text-brand-700' },
    publishing:      { label: 'Publicando',     className: 'bg-blue-100 text-blue-600' },
    published:       { label: 'Publicado',      className: 'bg-green-100 text-green-700' },
    error:           { label: 'Erro',           className: 'bg-red-100 text-red-600' },
  }
  const { label, className } = map[status] ?? map.error
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function EditableField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-adapta-400">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="field-input resize-y text-sm leading-relaxed"
      />
    </div>
  )
}

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 40 // 40 × 3s = 2 minutos

function CaseCard({ caseRow, onPublished }: { caseRow: CaseRow; onPublished: () => void }) {
  const [desafio, setDesafio] = useState(caseRow.desafio ?? '')
  const [resultado, setResultado] = useState(caseRow.resultado ?? '')
  const [content, setContent] = useState(caseRow.content ?? '')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function startPolling() {
    pollCountRef.current = 0
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current > POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current!)
        pollRef.current = null
        setError('Publicação está demorando mais que o esperado. Verifique o status mais tarde.')
        setPublishing(false)
        return
      }
      try {
        const res = await fetch(`/api/cases/status?case_id=${caseRow.id}`)
        if (!res.ok) return
        const { status, error_message } = await res.json()
        if (status === 'published') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setTimeout(() => onPublished(), 1500)
        } else if (status === 'error') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setError(error_message ?? 'Erro ao publicar no Framer')
          setPublishing(false)
        }
      } catch {
        // ignore transient polling errors
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/cases/review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ case_id: caseRow.id, desafio, resultado, content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError(null)

    try {
      const saveRes = await fetch('/api/cases/review', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ case_id: caseRow.id, desafio, resultado, content }),
      })
      if (!saveRes.ok) throw new Error('Falha ao salvar antes de publicar')

      // A API responde imediatamente — o publish roda em background
      const pubRes = await fetch('/api/cases/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ case_id: caseRow.id }),
      })
      if (!pubRes.ok) {
        const data = await pubRes.json()
        throw new Error(data.error ?? 'Erro ao iniciar publicação')
      }

      startPolling()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar')
      setPublishing(false)
    }
  }

  return (
    <div className="card p-6 flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={caseRow.status} />
            <span className="text-xs text-adapta-400">
              {new Date(caseRow.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <h3 className="text-base font-semibold text-adapta-900 mt-1">{caseRow.titulo_case}</h3>
          <p className="text-sm text-adapta-500">{caseRow.nome_empresa} · {caseRow.localizacao}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {caseRow.logo_url && (
            <img
              src={caseRow.logo_url}
              alt={caseRow.nome_empresa}
              className="h-10 w-10 rounded-lg object-contain border border-adapta-100 bg-white p-1"
            />
          )}
        </div>
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Setor', value: caseRow.setor_empresa },
          { label: 'Tamanho', value: caseRow.tamanho_empresa },
          { label: 'YouTube', value: caseRow.youtube_url },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-adapta-400">{label}</span>
            <span className="text-xs text-adapta-700 truncate">{value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-adapta-100" />

      {/* Conteúdo editável */}
      <EditableField label="Desafio Enfrentado" value={desafio} onChange={setDesafio} rows={4} />
      <EditableField label="Resultado" value={resultado} onChange={setResultado} rows={4} />
      <EditableField label="Content" value={content} onChange={setContent} rows={6} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || publishing}
          className="btn-secondary flex-1 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : saved ? 'Salvo ✓' : 'Salvar rascunho'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving || publishing}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {publishing ? 'Publicando no Framer...' : 'Publicar no Framer →'}
        </button>
      </div>
    </div>
  )
}

export default function CasesReview({ initialCases }: { initialCases: CaseRow[] }) {
  const [cases, setCases] = useState(initialCases)

  function handlePublished(id: string) {
    setCases((prev) => prev.filter((c) => c.id !== id))
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-adapta-400">Nenhum case aguardando revisão.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {cases.map((c) => (
        <CaseCard key={c.id} caseRow={c} onPublished={() => handlePublished(c.id)} />
      ))}
    </div>
  )
}
