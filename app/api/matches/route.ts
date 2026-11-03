import { NextRequest } from 'next/server'
import { dataMode, getMatches } from '@/lib/data'
import { parseRepositoryQuery, selectRepository } from '@/lib/repository-query'
import { savedHighlights } from '@/lib/editorial-data'
import { preparedMatchBrowser } from '@/lib/revista/read-records'
import { generationMetadata } from '@/lib/revista/generation'
import { proofSummary } from '@/lib/revista/snapshot'
import { queryMatchBrowserPage } from '@/lib/match-browser-snapshot'
import { ARCHIVE_CRITERIA } from '@/lib/quality'
import { requestCacheScope, versionedJson } from '@/lib/http-cache'
export async function GET(request: NextRequest) {
  const started=performance.now()
  let query
  try { query = parseRepositoryQuery(request.nextUrl.searchParams) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Filtros no válidos' }, { status: 400 }) }
  try {
    const mode = dataMode()
    const browser = mode === 'ARCHIVO REAL'
      ? await preparedMatchBrowser(query.tour as 'atp'|'wta',query.year||undefined,query.year||undefined)
      : undefined
    let result
    if(browser){
      const circuit=browser.index.circuits[query.tour as 'atp'|'wta']
      const tournament=query.slug==='all'?undefined:circuit.events.find(event=>event.slug===query.slug)
      if(query.slug!=='all'&&!tournament)throw new RangeError('Torneo no válido')
      result=queryMatchBrowserPage(browser.partitions,{
        q:query.query,player:query.player,year:query.year||undefined,tournament:tournament?.name,
        category:query.category==='all'?undefined:query.category,surface:query.surface==='all'?undefined:query.surface,
        round:query.round,fiveSets:query.fiveSets,kind:query.kind||undefined,
      },query.page,query.limit)
    }else{
      const source = await getMatches(query.year || undefined, undefined, true)
      result = selectRepository(source, query)
    }
    const matches = mode === 'ARCHIVO REAL'
      ? result.matches.map(proofSummary)
      : await savedHighlights(result.matches)
    const selectedGeneration=browser
    const payload={ ...result, matches, mode, criteria: ARCHIVE_CRITERIA, ...(selectedGeneration ? generationMetadata(selectedGeneration) : {}) }
    return selectedGeneration
      ? versionedJson(request,payload,{version:selectedGeneration.manifest.version,scope:requestCacheScope(request,'matches'),route:'matches',started})
      : Response.json(payload,{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}})
  } catch (error) {
    if (error instanceof RangeError) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ error: 'No se pudo leer el repositorio. Inténtalo de nuevo.' }, { status: 503 })
  }
}
