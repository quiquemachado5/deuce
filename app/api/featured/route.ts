import { getAnalyzableMatches } from '@/lib/data'
import { epicMatches } from '@/lib/explore'

export const revalidate = 3600
export async function GET() {
  const first = epicMatches(await getAnalyzableMatches(), 1)[0]
  if (!first) return Response.json({ featured: null })
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
  } })
}
