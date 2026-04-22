import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-600">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-adapta-900 tracking-tight">
          Depoimentos Adapta
        </h1>
        <p className="mt-3 text-sm text-adapta-500 leading-relaxed">
          Publique depoimentos de clientes diretamente no site,<br />
          sem precisar mexer no código.
        </p>
        <Link
          href="/depoimentos/novo"
          className="btn-primary inline-flex mt-8 px-8 py-3"
        >
          Publicar depoimento
        </Link>
      </div>
    </main>
  )
}
