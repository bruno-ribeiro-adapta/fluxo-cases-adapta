import type { Metadata } from 'next'
import './globals.css'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Fluxo Cases | Adapta',
  description: 'Pipeline de publicação de cases',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="pt-BR">
      <body className="bg-gray-50">
        {user && <Header userEmail={user.email!} />}
        {children}
      </body>
    </html>
  )
}
