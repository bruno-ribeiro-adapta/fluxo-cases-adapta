import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // Refresh session se expirada (mantém cookies atualizados)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')

  // Webhooks externos chamados por AssemblyAI e n8n — sem sessão de usuário
  const isPublicWebhook =
    pathname === '/api/assemblyai/webhook' ||
    pathname === '/api/cases/callback' ||
    pathname === '/api/n8n/callback'

  if (!user && !isLoginPage && !isPublicWebhook) {
    // Rotas de API retornam 401; páginas redirecionam para /login
    if (isApiRoute) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
