import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'

export const revalidate = 60

export async function GET(request:Request) {
  const generation = await preparedGeneration(), manifest = generation.manifest
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp';
  const matches=(await generation.matches()).filter(m=>(m.tour||'atp')===tour);
  const years=matches.map(m=>m.year);
  return Response.json({
    tour,
    matches: matches.length,
    firstYear: years.length ? years.reduce((a,b)=>Math.min(a,b),Infinity) : null,
    lastYear: years.length ? years.reduce((a,b)=>Math.max(a,b),-Infinity) : null,
    tournaments: new Set(matches.map(m=>m.tournament)).size,
    mode: manifest.mode,
    ...generationMetadata(generation),
  }, { headers: { 'X-DEUCE-Dataset-Version': manifest.version } })
}
