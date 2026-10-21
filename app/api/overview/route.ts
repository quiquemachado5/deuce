import { getMatches, dataMode } from '@/lib/data'

export const revalidate = 60

export async function GET() {
  const matches = await getMatches(undefined, undefined, true)
  const years = matches.map(match => match.year).filter(Boolean)
  return Response.json({
    matches: matches.length,
    firstYear: years.length ? Math.min(...new Set(years)) : null,
    lastYear: years.length ? Math.max(...new Set(years)) : null,
    tournaments: new Set(matches.map(match => match.tournament)).size,
    mode: dataMode(),
  })
}
