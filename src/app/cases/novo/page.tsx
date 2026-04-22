import CaseForm from '@/components/forms/CaseForm'

export const metadata = {
  title: 'Novo Case | Adapta',
}

export default function NovoCasePage() {
  return (
    <main className="min-h-[calc(100vh-57px)] py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-adapta-900">Novo case</h1>
          <p className="mt-1 text-sm text-adapta-500">
            Preencha os dados e a IA vai gerar o conteúdo do case automaticamente.
          </p>
        </div>
        <div className="card p-6">
          <CaseForm />
        </div>
      </div>
    </main>
  )
}
