'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'

const schema = z.object({
  titulo_case: z.string().min(1, 'Título é obrigatório'),
  nome_empresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  localizacao: z.string().min(1, 'Localização é obrigatória'),
  setor_empresa: z.string().min(1, 'Setor é obrigatório'),
  tamanho_empresa: z.string().min(1, 'Tamanho é obrigatório'),
  pequena_descricao: z.string().min(1, 'Pequena descrição é obrigatória'),
  youtube_url: z
    .string()
    .min(1, 'URL do YouTube é obrigatória')
    .url('Informe uma URL válida')
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be'),
      'A URL deve ser do YouTube'
    ),
})

type FormValues = z.infer<typeof schema>

type PageState =
  | { type: 'form' }
  | { type: 'submitting' }
  | { type: 'success'; caseId: string }
  | { type: 'error'; message: string }

interface FileUploadState {
  file: File | null
  preview: string | null
  error: string | null
}

function FileUpload({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: FileUploadState
  onChange: (state: FileUploadState) => void
  required?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      onChange({ file: null, preview: null, error: 'Máximo 10MB.' })
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onChange({ file: null, preview: null, error: 'Use JPG, PNG ou WebP.' })
      return
    }
    const preview = URL.createObjectURL(file)
    onChange({ file, preview, error: null })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-adapta-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-adapta-200 bg-adapta-50 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors h-28"
      >
        {value.preview ? (
          <img src={value.preview} alt="preview" className="h-full w-full object-contain rounded-xl p-1" />
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-adapta-400">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-adapta-400">Arraste ou clique para enviar</span>
            <span className="text-[10px] text-adapta-300">JPG, PNG, WebP · Máx 10MB</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {value.error && <p className="text-xs text-red-500">{value.error}</p>}
      {value.preview && (
        <button
          type="button"
          onClick={() => onChange({ file: null, preview: null, error: null })}
          className="text-xs text-adapta-400 hover:text-red-400 self-start"
        >
          Remover
        </button>
      )}
    </div>
  )
}

const emptyFile: FileUploadState = { file: null, preview: null, error: null }

export default function CaseForm() {
  const [pageState, setPageState] = useState<PageState>({ type: 'form' })
  const [logo, setLogo] = useState<FileUploadState>(emptyFile)
  const [thumb, setThumb] = useState<FileUploadState>(emptyFile)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setPageState({ type: 'submitting' })

    // 1. Cria o case
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      setPageState({ type: 'error', message: result.error ?? `Erro ${res.status}` })
      return
    }

    const caseId = result.case_id as string

    // 2. Upload dos arquivos (em paralelo, não bloqueia o fluxo principal se falhar)
    const uploads: Promise<void>[] = []

    for (const [field, state] of [['logo', logo], ['thumb', thumb]] as const) {
      if (!state.file) continue
      const fd = new FormData()
      fd.append('case_id', caseId)
      fd.append('field', field)
      fd.append('file', state.file)
      uploads.push(
        fetch('/api/cases/upload', { method: 'POST', body: fd })
          .then((r) => { if (!r.ok) console.warn(`[form] Upload ${field} falhou`) })
          .catch((e) => console.warn(`[form] Upload ${field} erro:`, e))
      )
    }

    await Promise.all(uploads)

    setPageState({ type: 'success', caseId })
  }

  if (pageState.type === 'success') {
    return (
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#257C70" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h3 className="text-base font-semibold text-adapta-900">Case enviado!</h3>
        <p className="mt-2 text-sm text-adapta-500 max-w-xs mx-auto">
          A transcrição do vídeo foi iniciada. Quando a IA terminar de gerar o conteúdo, ele aparecerá no painel para revisão.
        </p>
        <p className="mt-3 text-xs text-adapta-400">
          ID: <code className="bg-adapta-100 rounded px-1.5 py-0.5 font-mono">{pageState.caseId}</code>
        </p>
        <button
          onClick={() => {
            setPageState({ type: 'form' })
            setLogo(emptyFile)
            setThumb(emptyFile)
          }}
          className="btn-primary mx-auto mt-6 px-6"
        >
          Adicionar outro case
        </button>
      </div>
    )
  }

  if (pageState.type === 'submitting') {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-4">
          <svg className="h-10 w-10 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-adapta-800">Salvando e iniciando transcrição...</p>
        <p className="mt-1 text-xs text-adapta-500">Aguarde um momento.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {pageState.type === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {pageState.message}
        </div>
      )}

      <Input
        label="Título do case"
        placeholder="Ex: Como a Empresa X reduziu custos em 40% com IA"
        required
        {...register('titulo_case')}
        error={errors.titulo_case?.message}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome da empresa"
          placeholder="Ex: Clínica São Paulo"
          required
          {...register('nome_empresa')}
          error={errors.nome_empresa?.message}
        />
        <Input
          label="Localização"
          placeholder="Ex: São Paulo, SP"
          required
          {...register('localizacao')}
          error={errors.localizacao?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Setor da empresa"
          placeholder="Ex: Saúde e Medicina"
          required
          {...register('setor_empresa')}
          error={errors.setor_empresa?.message}
        />
        <Input
          label="Tamanho da empresa"
          placeholder="Ex: 11–50 funcionários"
          required
          {...register('tamanho_empresa')}
          error={errors.tamanho_empresa?.message}
        />
      </div>

      <Input
        label="Pequena Descrição"
        placeholder="Ex: Redução de 40% nos custos operacionais em 3 meses"
        required
        {...register('pequena_descricao')}
        error={errors.pequena_descricao?.message}
      />

      <Input
        label="Link do YouTube"
        type="url"
        placeholder="https://www.youtube.com/watch?v=..."
        required
        {...register('youtube_url')}
        error={errors.youtube_url?.message}
        hint="Vídeo que será transcrito pela IA"
      />

      <div className="grid grid-cols-2 gap-4">
        <FileUpload label="Logo da empresa" value={logo} onChange={setLogo} />
        <FileUpload label="Thumbnail do case" value={thumb} onChange={setThumb} />
      </div>

      <button type="submit" className="btn-primary w-full py-3 mt-1">
        Enviar para processamento →
      </button>
    </form>
  )
}
