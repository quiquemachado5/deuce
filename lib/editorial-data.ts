import 'server-only'
import { cache } from 'react'
import { asyncCache } from './async-cache'
import { invalidateDataCache, getMatches, getAnalyzableMatches } from './data'
import type { Match } from './types'
import { sentence } from './cuaderno/model'
/** Detail enriches the archive without changing its validated result universe. */
const merged = asyncCache<Match[]>(300_000, 1)
export const editorialArchive = cache(async (year?:number) => {
  const matches = await merged('all', async () => {
    const [summaries,details]=await Promise.all([getMatches(undefined,undefined,true),getAnalyzableMatches()])
    const byId=new Map(details.map(match=>[match.match_id,match]))
    return summaries.map(match=>byId.get(match.match_id)||match)
  })
  return year ? matches.filter(match=>match.year===year) : matches
})

export async function savedHighlights(matches:Match[]) {
  const years=[...new Set(matches.map(m=>m.year))]
  const records=(await Promise.all(years.map(year=>getAnalyzableMatches(year)))).flat()
  const byId=new Map(records.map(m=>[m.match_id,m]))
  return matches.map(m=>({...m,editorial_highlight:sentence(byId.get(m.match_id)||m)}))
}

export function invalidateEditorialCache() { merged.clear(); invalidateDataCache() }
