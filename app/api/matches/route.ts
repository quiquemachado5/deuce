import { NextRequest } from 'next/server'
import { dataMode, getMatches } from '@/lib/data'
import { parseRepositoryQuery, selectRepository } from '@/lib/repository-query'
import { savedHighlights } from '@/lib/editorial-data'
import { preparedArchive } from '@/lib/revista/read-records'
import { proofSummary } from '@/lib/revista/snapshot'
import { sentence } from '@/lib/cuaderno/model'
import { ARCHIVE_CRITERIA } from '@/lib/quality'
export async function GET(request: NextRequest) {
  let query
  try { query = parseRepositoryQuery(request.nextUrl.searchParams) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Filtros no válidos' }, { status: 400 }) }
  try {
    const mode = dataMode()
    const source = mode === 'ARCHIVO REAL'
      ? await preparedArchive()
      : await getMatches(query.year || undefined, undefined, true)
    const result = selectRepository(source, query)
    const matches = mode === 'ARCHIVO REAL'
      ? result.matches.map(match => ({ ...proofSummary(match), editorial_highlight: sentence(match) }))
      : await savedHighlights(result.matches)
    return Response.json({ ...result, matches, mode, criteria: ARCHIVE_CRITERIA }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
  } catch (error) {
    if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ error: 'No se pudo leer el repositorio. Inténtalo de nuevo.' }, { status: 503 })
  }
}
