import { preparedGeneration } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
import { epicMatches } from '@/lib/explore'

export const revalidate = 3600
export async function GET() {
  const generation = await preparedGeneration(), metadata = generationMetadata(generation)
  const headers = { 'X-DEUCE-Dataset-Version': generation.manifest.version }
  const first = epicMatches((await generation.matches()).filter(match=>match.point_tape.length), 1)[0]
  if (!first) return Response.json({ featured: null, ...metadata }, { headers })
  const { match, drama } = first
  return Response.json({ featured: {
    id: match.match_id,
    player1: match.player1.name,
    player2: match.player2.name,
    tournament: match.tournament,
    surface: match.surface,
    score: match.final_score,
    year: match.year,
    drama: drama.score,
    points: match.point_tape.filter(point => point.winner !== null).map(point => ({ number: point.point_number, winner: point.winner, break: point.is_break_point })),
  }, ...metadata }, { headers })
}
