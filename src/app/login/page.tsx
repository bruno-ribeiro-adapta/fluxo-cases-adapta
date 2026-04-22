import LoginForm from '@/components/forms/LoginForm'

export const metadata = {
  title: 'Entrar | Adapta',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-adapta-900 flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Adapta</h1>
        <p className="mt-1 text-sm text-adapta-500">Publicação de depoimentos</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-adapta-800 bg-adapta-950 p-8 shadow-card-md">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Bem-vindo</h2>
            <p className="mt-1 text-sm text-adapta-500">Entre com suas credenciais de acesso.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
