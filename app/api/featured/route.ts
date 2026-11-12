import { DATASET_CACHE_CONTROL } from '@/lib/http-cache';
import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
import { epicMatches } from '@/lib/explore'
import { requestCacheScope, versionedJson } from '@/lib/http-cache'
import type { Match } from '@/lib/types'

export const revalidate = 300
export async function GET(request:Request) {
  const started=performance.now()
  const generation = await preparedGeneration(), metadata = generationMetadata(generation)
  const tour=new URL(request.url).searchParams.get('tour')==='wta'?'wta':'atp'
  const home=generation.manifest.home;
  const candidates=[home?.selection.featured,home?.selection.anniversary,...(home?.selection.anniversaries||[]),...(home?.selection.latest||[])].filter((match):match is Match=>Boolean(match&&(match.tour||'atp')===tour&&match.point_tape.length));
  const first = epicMatches(candidates, 1)[0]
  if (!first) return versionedJson(request,{featured:null,...metadata},{version:generation.manifest.version,scope:requestCacheScope(request,'featured'),route:'featured',started,cacheControl:DATASET_CACHE_CONTROL})
  const { match, drama } = first
  return versionedJson(request,{ featured: {
    id: match.match_id, tour,
    player1: match.player1.name,
    player2: match.player2.name,
    tournament: match.tournament,
    surface: match.surface,
    score: match.final_score,
    year: match.year,
    drama: drama.score,
    points: match.point_tape.filter(point => point.winner !== null).map(point => ({ number: point.point_number, winner: point.winner, break: point.is_break_point })),
  }, ...metadata },{version:generation.manifest.version,scope:requestCacheScope(request,'featured'),route:'featured',started,cacheControl:DATASET_CACHE_CONTROL})
}
