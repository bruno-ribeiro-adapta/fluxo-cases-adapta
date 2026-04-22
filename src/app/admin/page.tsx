import { createAuthServerClient } from '@/lib/supabase/ssr'
import { createServerClient } from '@/lib/supabase/client'
import AdminDashboard from '@/components/admin/AdminDashboard'
import Link from 'next/link'

export const metadata = {
  title: 'Administradores | Adapta',
}

export default async function AdminPage() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  const supabase = createServerClient()
  const { data: admins } = await supabase
    .from('admins')
    .select('id, email, created_at, created_by')
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-[calc(100vh-57px)] py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-adapta-900">Administradores</h1>
            <p className="mt-1 text-sm text-adapta-500">
              Gerencie quem pode publicar depoimentos.
            </p>
          </div>
          <Link href="/" className="btn-secondary text-xs px-3 py-2">
            ← Voltar
          </Link>
        </div>

        <AdminDashboard
          initialAdmins={admins ?? []}
          currentUserEmail={user?.email ?? ''}
        />
      </div>
    </main>
  )
}
