import DepoimentoForm from '@/components/forms/DepoimentoForm'

export const metadata = {
  title: 'Novo Depoimento | Adapta',
}

export default function NovoDepoimento() {
  return (
    <main className="min-h-[calc(100vh-57px)] py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-adapta-900">Publicar depoimento</h1>
          <p className="mt-1 text-sm text-adapta-500">
            Preencha os dados, revise e publique direto no site.
          </p>
        </div>
        <div className="card p-6">
          <DepoimentoForm />
        </div>
      </div>
    </main>
  )
}
