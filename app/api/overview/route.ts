import { preparedManifest } from '@/lib/revista/read-records'

export const revalidate = 60

export async function GET() {
  const manifest = await preparedManifest()
  return Response.json({
    matches: manifest.matchCount,
    firstYear: manifest.years.length ? Math.min(...manifest.years) : null,
    lastYear: manifest.years.length ? Math.max(...manifest.years) : null,
    tournaments: manifest.summary.tournaments,
    mode: manifest.mode,
    datasetVersion: manifest.version,
    rulesVersion: manifest.rulesVersion,
    generatedAt: manifest.generatedAt,
  })
}
