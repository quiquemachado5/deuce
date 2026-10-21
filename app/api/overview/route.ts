import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'

export const revalidate = 60

export async function GET() {
  const generation = await preparedGeneration(), manifest = generation.manifest
  return Response.json({
    matches: manifest.matchCount,
    firstYear: manifest.years.length ? Math.min(...manifest.years) : null,
    lastYear: manifest.years.length ? Math.max(...manifest.years) : null,
    tournaments: manifest.summary.tournaments,
    mode: manifest.mode,
    ...generationMetadata(generation),
  }, { headers: { 'X-DEUCE-Dataset-Version': manifest.version } })
}
