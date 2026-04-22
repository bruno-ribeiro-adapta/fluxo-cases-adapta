# fluxo-cases-adapta

Pipeline completo para publicação automática de cases no CMS do Framer.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript (strict)
- **Estilização**: Tailwind CSS
- **Banco de dados**: Supabase (PostgreSQL)
- **Automação**: n8n (via webhook)
- **CMS**: Framer CMS (via REST API)
- **Validação**: Zod
- **Formulários**: React Hook Form

## Estrutura de pastas

```
src/
  app/
    api/          # Route Handlers (Next.js App Router)
    cases/        # Páginas de cases
  components/
    forms/        # Formulários
    ui/           # Componentes genéricos
  lib/
    supabase/     # Clients e utilitários do Supabase
    n8n/          # Helpers de integração com n8n
    framer/       # Client, mapper e publisher do Framer CMS
  types/          # Tipos TypeScript compartilhados
scripts/          # Scripts de execução manual (publish-cases)
supabase/
  migrations/     # Migrations SQL
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Nunca commitar `.env.local`.

## Comandos

```bash
npm run dev           # Desenvolvimento
npm run build         # Build de produção
npm run publish:cases # Publica cases prontos no Framer CMS
```

## Convenções

- Todos os segredos ficam apenas em variáveis de ambiente
- Service role do Supabase nunca exposta no frontend
- Token do Framer nunca no código-fonte
- Callbacks externos validam `N8N_CALLBACK_SECRET` no header `x-webhook-secret`
- Logs úteis mas sem expor valores sensíveis
