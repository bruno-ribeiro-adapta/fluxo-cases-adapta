'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'

const QUOTE_MAX = 78

const TAG_OPTIONS = [
  { value: 'Saúde e Medicina', label: 'Saúde e Medicina' },
  { value: 'Contabilidade e Finanças', label: 'Contabilidade e Finanças' },
  { value: 'Recursos Humanos', label: 'Recursos Humanos' },
  { value: 'Jurídico', label: 'Jurídico' },
  { value: 'Empreendedorismo', label: 'Empreendedorismo' },
  { value: 'E-commerce e Varejo', label: 'E-commerce e Varejo' },
]

const schema = z.object({
  client_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  role_company: z.string().min(1, 'Cargo/Empresa é obrigatório'),
  industry: z.string().min(1, 'Setor é obrigatório'),
  youtube_url: z
    .string()
    .min(1, 'URL do YouTube é obrigatória')
    .url('Informe uma URL válida')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'A URL deve ser do YouTube'
    ),
  quote_description: z
    .string()
    .min(1, 'A citação é obrigatória')
    .max(QUOTE_MAX, `Máximo de ${QUOTE_MAX} caracteres`),
  tag: z.string().min(1, 'Selecione uma categoria'),
})

type FormValues = z.infer<typeof schema>

type PageState =
  | { type: 'form' }
  | { type: 'reviewing'; data: FormValues }
  | { type: 'publishing' }
  | { type: 'success'; depoimentoId: string }
  | { type: 'error'; message: string; data: FormValues }

// ——— Step indicator ———
function Steps({ current }: { current: 1 | 2 | 3 }) {
  const items = ['Preencher', 'Revisar', 'Publicado']
  return (
    <div className="flex items-center mb-7">
      {items.map((label, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                    : 'bg-adapta-100 text-adapta-400'
                }`}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : num}
              </div>
              <span className={`text-[11px] font-medium ${active || done ? 'text-adapta-700' : 'text-adapta-400'}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${done ? 'bg-brand-600' : 'bg-adapta-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ——— Review row ———
function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-adapta-100 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-adapta-400">{label}</span>
      <span className="text-sm text-adapta-900 break-words leading-relaxed">{value}</span>
    </div>
  )
}

export default function DepoimentoForm() {
  const [pageState, setPageState] = useState<PageState>({ type: 'form' })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tag: '' },
  })

  const quoteValue = watch('quote_description') ?? ''
  const quoteLen = quoteValue.length
  const quoteOver = quoteLen > QUOTE_MAX

  function goToReview(data: FormValues) {
    setPageState({ type: 'reviewing', data })
  }

  async function publish(data: FormValues) {
    setPageState({ type: 'publishing' })

    try {
      const response = await fetch('/api/depoimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setPageState({ type: 'error', message: result.error ?? `Erro ${response.status}.`, data })
        return
      }

      setPageState({ type: 'success', depoimentoId: result.depoimento_id })
    } catch {
      setPageState({
        type: 'error',
        message: 'Falha de conexão. Verifique sua internet e tente novamente.',
        data,
      })
    }
  }

  // ——— Sucesso ———
  if (pageState.type === 'success') {
    return (
      <div className="text-center py-4">
        <Steps current={3} />
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#257C70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h3 className="text-base font-semibold text-adapta-900">Publicado com sucesso!</h3>
        <p className="mt-1 text-sm text-adapta-500">O depoimento está no ar no site da Adapta.</p>
        <p className="mt-2 text-xs text-adapta-400">
          ID: <code className="bg-adapta-100 rounded px-1.5 py-0.5 font-mono">{pageState.depoimentoId}</code>
        </p>
        <button
          onClick={() => setPageState({ type: 'form' })}
          className="btn-primary mx-auto mt-6 px-6"
        >
          Publicar outro
        </button>
      </div>
    )
  }

  // ——— Publicando ———
  if (pageState.type === 'publishing') {
    return (
      <div className="text-center py-8">
        <Steps current={2} />
        <div className="flex justify-center mb-4">
          <svg className="h-10 w-10 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-adapta-800">Publicando no Framer CMS...</p>
        <p className="mt-1 text-xs text-adapta-500">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

  // ——— Revisão / erro na revisão ———
  if (pageState.type === 'reviewing' || pageState.type === 'error') {
    const data = pageState.data
    const isError = pageState.type === 'error'

    return (
      <div>
        <Steps current={2} />

        <div className="mb-5">
          <h3 className="text-sm font-semibold text-adapta-900">Confirme os dados</h3>
          <p className="text-xs text-adapta-500 mt-0.5">Revise tudo antes de publicar.</p>
        </div>

        <div className="rounded-xl border border-adapta-200 bg-adapta-50 px-4 divide-y divide-adapta-100 mb-5">
          <ReviewField label="Cliente" value={data.client_name} />
          <ReviewField label="Cargo / Empresa" value={data.role_company} />
          <ReviewField label="Setor" value={data.industry} />
          <ReviewField label="Link do YouTube" value={data.youtube_url} />
          <ReviewField label="Citação" value={`"${data.quote_description}"`} />
          <ReviewField label="Categoria" value={data.tag} />
        </div>

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-5">
            {pageState.message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setPageState({ type: 'form' })}
            className="btn-secondary flex-1"
          >
            ← Editar
          </button>
          <button
            onClick={() => publish(data)}
            className="btn-primary flex-1"
          >
            {isError ? 'Tentar novamente' : 'Publicar agora'}
          </button>
        </div>
      </div>
    )
  }

  // ——— Formulário ———
  return (
    <form onSubmit={handleSubmit(goToReview)} className="flex flex-col gap-5" noValidate>
      <Steps current={1} />

      <Input
        label="Nome do cliente"
        placeholder="Ex: Maria Silva"
        required
        {...register('client_name')}
        error={errors.client_name?.message}
      />

      <Input
        label="Cargo / Empresa"
        placeholder="Ex: CEO na Empresa X"
        required
        {...register('role_company')}
        error={errors.role_company?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Setor"
          placeholder="Ex: Saúde, Tecnologia..."
          required
          {...register('industry')}
          error={errors.industry?.message}
        />
        <Select
          label="Categoria"
          placeholder="Selecione..."
          options={TAG_OPTIONS}
          required
          {...register('tag')}
          error={errors.tag?.message}
        />
      </div>

      <Input
        label="Link do YouTube"
        type="url"
        placeholder="https://www.youtube.com/watch?v=..."
        required
        {...register('youtube_url')}
        error={errors.youtube_url?.message}
        hint="URL do vídeo de depoimento"
      />

      <div className="flex flex-col gap-1.5">
        <Textarea
          label="Citação"
          placeholder="Ex: A Adapta transformou completamente nossa operação em apenas 3 meses"
          required
          maxLength={QUOTE_MAX}
          {...register('quote_description')}
          error={errors.quote_description?.message}
          hint='Escreva sem aspas — serão adicionadas automaticamente.'
        />
        <div className="flex justify-end">
          <span className={`text-xs tabular-nums font-medium ${quoteOver ? 'text-red-500' : quoteLen > QUOTE_MAX * 0.85 ? 'text-amber-500' : 'text-adapta-400'}`}>
            {quoteLen}/{QUOTE_MAX}
          </span>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-3 mt-1">
        Revisar →
      </button>
    </form>
  )
}
