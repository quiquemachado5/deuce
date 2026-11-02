import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'

export const revalidate = 60

export async function GET(request:Request) {
  const generation = await preparedGeneration(), manifest = generation.manifest
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
  const coverage=manifest.circuitCoverage?.[tour];
  const matches=coverage?.matches??manifest.summary.tours[tour];
  return Response.json({
    tour,
    matches,
    firstYear: coverage?.firstYear??null,
    lastYear: coverage?.lastYear??null,
    tournaments: coverage?.tournaments??0,
    mode: manifest.mode,
    ...generationMetadata(generation),
  }, { headers: { 'X-DEUCE-Dataset-Version': manifest.version } })
}
