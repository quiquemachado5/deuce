import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
import { requestCacheScope, versionedJson } from '@/lib/http-cache'

export const revalidate = 60

export async function GET(request:Request) {
  const started=performance.now()
  const generation = await preparedGeneration(), manifest = generation.manifest
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
  const coverage=manifest.circuitCoverage?.[tour];
  const matches=coverage?.matches??manifest.summary.tours[tour];
  return versionedJson(request,{
    tour,
    matches,
    firstYear: coverage?.firstYear??null,
    lastYear: coverage?.lastYear??null,
    tournaments: coverage?.tournaments??0,
    mode: manifest.mode,
    ...generationMetadata(generation),
  },{version:manifest.version,scope:requestCacheScope(request,'overview'),route:'overview',started})
}
