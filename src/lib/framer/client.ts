// =============================================================
// Framer Server API client
// Usa o pacote oficial `framer-api` (WebSocket, não REST)
// Docs: https://www.framer.com/developers/server-api-introduction
// =============================================================

import { connect, type Collection, type Framer } from 'framer-api'

export type { Collection, Framer }

export function getFramerCredentials(): { projectUrl: string; apiKey: string } {
  const projectUrl = process.env.FRAMER_PROJECT_URL
  const apiKey = process.env.FRAMER_API_KEY

  if (!projectUrl) throw new Error('Variável FRAMER_PROJECT_URL não configurada.')
  if (!apiKey) throw new Error('Variável FRAMER_API_KEY não configurada.')

  return { projectUrl, apiKey }
}

export async function connectToFramer(): Promise<Framer> {
  const { projectUrl, apiKey } = getFramerCredentials()
  return connect(projectUrl, apiKey)
}

export async function getCollectionByName(
  framer: Framer,
  name: string
): Promise<Collection> {
  const collections = await framer.getCollections()
  const found = collections.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )

  if (!found) {
    const available = collections.map((c) => c.name).join(', ')
    throw new Error(
      `Collection "${name}" não encontrada. Disponíveis: ${available}`
    )
  }

  return found
}

export async function publishAndDeploy(framer: Framer): Promise<string | null> {
  const result = await framer.publish()
  const deploymentId = result.deployment.id

  console.log(`[framer] Preview criado: deployment ${deploymentId}. Fazendo deploy...`)

  const hostnames = await framer.deploy(deploymentId)
  const productionHost = hostnames.find((h) => h.type === 'default' || h.type === 'custom')

  return productionHost?.hostname ?? null
}
