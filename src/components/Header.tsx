'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createAuthBrowserClient } from '@/lib/supabase/browser'

interface HeaderProps {
  userEmail: string
}

export default function Header({ userEmail }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createAuthBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/depoimentos/novo', label: 'Novo depoimento' },
    { href: '/cases/novo', label: 'Novo case' },
    { href: '/admin/cases', label: 'Revisar cases' },
    { href: '/admin', label: 'Administradores' },
  ]

  return (
    <header className="bg-adapta-900 border-b border-adapta-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-bold text-white tracking-tight">
            Adapta
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors duration-150 ${
                  pathname === link.href
                    ? 'text-brand-400 font-medium'
                    : 'text-adapta-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden md:block text-xs text-adapta-500 font-medium">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-adapta-400 hover:text-red-400 transition-colors duration-150"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
