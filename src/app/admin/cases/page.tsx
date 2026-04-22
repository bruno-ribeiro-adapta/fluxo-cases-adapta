import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import { createServerClient } from '@/lib/supabase/client'
import CasesReview from '@/components/admin/CasesReview'
import type { CaseRow } from '@/types/cases'

export const metadata = {
  title: 'Revisão de Cases | Adapta',
}

export default async function AdminCasesPage() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createServerClient()
  const { data } = await supabase
    .from('cases')
    .select('*')
    .eq('status', 'ready_to_review')
    .order('created_at', { ascending: true })

  const cases = (data ?? []) as CaseRow[]

  return (
    <main className="min-h-[calc(100vh-57px)] py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-adapta-900">Revisão de cases</h1>
          <p className="mt-1 text-sm text-adapta-500">
            {cases.length === 0
              ? 'Nenhum case aguardando revisão.'
              : `${cases.length} case${cases.length > 1 ? 's' : ''} aguardando revisão.`}
          </p>
        </div>
        <CasesReview initialCases={cases} />
      </div>
    </main>
  )
}
