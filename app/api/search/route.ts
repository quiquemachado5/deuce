import { quickSearchArchive } from '@/lib/cuaderno/search';
import { rateLimit } from '@/lib/rate-limit';
import { generationMetadata } from '@/lib/revista/generation';
import { preparedMatchBrowser, preparedMatchBrowserIndex } from '@/lib/revista/read-records';
import { approximateName, canonicalSearchText, exactPlayerSearch } from '@/lib/search-text';
import { logEvent, requestId } from '@/lib/structured-log';
import { queryMatchBrowserPage } from '@/lib/match-browser-snapshot';
import { tournamentName } from '@/lib/labels';
import { round, score, sentence } from '@/lib/cuaderno/model';
import type { SearchItem } from '@/components/revista/Frame';
import { requestCacheScope, versionedJson } from '@/lib/http-cache';

export async function GET(request: Request) {
  const id = requestId(request);
  const parameters = new URL(request.url).searchParams;
  const quickMode = parameters.get('mode') === 'quick';
  const budget = rateLimit(request, quickMode ? 'search-quick' : 'search', quickMode ? 90 : 45, 60_000);
  if (!budget.allowed) return Response.json({ error: 'Demasiadas búsquedas. Inténtalo de nuevo en un momento.' }, { status: 429, headers: { 'Retry-After': String(budget.retryAfter), 'X-Request-Id': id } });
  const query = parameters.get('q')?.trim().slice(0, 100) || '';
  if (query.length < 2) return Response.json({ items: [], minimumQueryLength: 2 }, { headers: { 'X-Request-Id': id } });
  const started = performance.now();
  try {
    const requestedTour = parameters.get('tour');
    const tour: 'atp' | 'wta' | undefined = requestedTour === 'wta' ? 'wta' : requestedTour === 'all' ? undefined : 'atp';
    if (quickMode) {
      // Typeahead only needs prepared player rows and record names. Keeping the
      // match artifact closed removes the dominant cold-start cost.
      const data = await preparedMatchBrowserIndex();
      const allPlayers = (['atp','wta'] as const).flatMap(circuit => data.index.circuits[circuit].players.map(player => ({...player,tour:circuit})));
      const players = tour ? allPlayers.filter(player => player.tour === tour) : allPlayers;
      const pieces = tour === 'wta' ? data.manifest.circuitPieces?.wta || [] : data.manifest.pieces;
      const selectedExactPlayer=players.some(player=>exactPlayerSearch(query,player.name));
      const foreignExactPlayer=Boolean(tour)&&!selectedExactPlayer&&allPlayers.some(player=>player.tour!==tour&&exactPlayerSearch(query,player.name));
      const items = foreignExactPlayer ? [] : tour
        ? quickSearchArchive(query, players, { pieces, tour })
        : [
            ...quickSearchArchive(query, allPlayers.filter(player=>player.tour==='atp'), {pieces:data.manifest.pieces,tour:'atp'}),
            ...quickSearchArchive(query, allPlayers.filter(player=>player.tour==='wta'), {pieces:data.manifest.circuitPieces?.wta||[],tour:'wta'}),
          ].filter((item,index,all)=>all.findIndex(candidate=>candidate.href===item.href)===index);
      const elapsedMs = Math.round(performance.now() - started);
      if (elapsedMs > 250) logEvent('warn', 'search.slow', { requestId: id, elapsedMs, queryLength: query.length, mode: 'quick' });
      return versionedJson(request,{ items, ...generationMetadata(data) },{
        version:data.manifest.version,scope:requestCacheScope(request,'search'),route:'search',started,
        headers:{'X-DEUCE-Search-Mode':'quick','X-Request-Id':id,'X-RateLimit-Remaining':String(budget.remaining),'Server-Timing':`search;dur=${elapsedMs}`},
      });
    }
    const data = await preparedMatchBrowser(tour || 'all');
    const circuits = (tour ? [tour] : ['atp','wta']) as Array<'atp'|'wta'>;
    const allPlayers = (['atp','wta'] as const).flatMap(circuit => data.index.circuits[circuit].players.map(player => ({...player,tour:circuit})));
    const players = tour ? allPlayers.filter(player => player.tour === tour) : allPlayers;
    const selectedExactPlayer=players.some(player=>exactPlayerSearch(query,player.name));
    const foreignExactPlayer=Boolean(tour)&&!selectedExactPlayer&&allPlayers.some(player=>player.tour!==tour&&exactPlayerSearch(query,player.name));
    const pieces = tour === 'wta' ? data.manifest.circuitPieces?.wta || [] : data.manifest.pieces;
    const items: SearchItem[] = foreignExactPlayer ? [] : tour
      ? quickSearchArchive(query, players, { pieces, tour })
      : circuits.flatMap(circuit => quickSearchArchive(query, allPlayers.filter(player=>player.tour===circuit), {
          pieces:circuit==='wta'?data.manifest.circuitPieces?.wta||[]:data.manifest.pieces,tour:circuit,
        }));
    const terms=canonicalSearchText(query).split(/\s+/).filter(Boolean);
    const requestedYear=terms.find(term=>/^\d{4}$/.test(term));
    const eventTerms=terms.filter(term=>term!==requestedYear);
    if(!foreignExactPlayer&&eventTerms.length){
      const eventQuery=eventTerms.join(' ');
      for(const circuit of circuits){
        const found=data.index.circuits[circuit].events.filter(event=>{
          const text=event.search||canonicalSearchText(`${event.name} ${tournamentName(event.name)}`);
          return eventTerms.every(term=>text.includes(term))||approximateName(eventQuery,tournamentName(event.name));
        }).slice(0,3);
        for(const event of found){
          const suffix=circuit==='wta'?'?cuadro=wta':'';
          if(!requestedYear)items.push({href:`/torneos/${event.slug}${suffix}`,name:tournamentName(event.name),group:'Torneos',detail:`${circuit.toUpperCase()} · ${event.count.toLocaleString('es-ES')} partidos en el archivo`});
          for(const year of event.years.filter(year=>!requestedYear||year===Number(requestedYear)).slice(0,requestedYear?1:2))items.push({href:`/torneos/${event.slug}/${year}${suffix}`,name:`${tournamentName(event.name)} ${year}`,group:'Ediciones',detail:`${circuit.toUpperCase()} · Resultados`});
        }
      }
    }
    if(!foreignExactPlayer){
      const matches=queryMatchBrowserPage(data.partitions,{q:query},1,Math.max(1,25-items.length)).matches;
      for(const match of matches.slice(0,Math.max(0,25-items.length)))items.push({
        href:`/match/${match.match_id}`,name:`${match.player1.name} contra ${match.player2.name}`,group:'Partidos',
        detail:`${match.tour==='wta'?'WTA':'ATP'} · ${tournamentName(match.tournament)} · ${match.year} · ${round(match)} · ${score(match)}${sentence(match)||match.editorial_highlight?` · ${sentence(match)||match.editorial_highlight}`:''}`,
      });
    }
    const unique=items.filter((item,index,all)=>all.findIndex(candidate=>candidate.href===item.href)===index).slice(0,25);
    const elapsedMs = Math.round(performance.now() - started);
    if (elapsedMs > 250) logEvent('warn', 'search.slow', { requestId: id, elapsedMs, queryLength: query.length });
    return versionedJson(request,{ items:unique, ...generationMetadata(data) },{
      version:data.manifest.version,scope:requestCacheScope(request,'search'),route:'search',started,
      headers:{'X-DEUCE-Search-Mode':'compact','X-Request-Id':id,'X-RateLimit-Remaining':String(budget.remaining),'Server-Timing':`search;dur=${elapsedMs}`},
    });
  } catch (error) {
    logEvent('error', 'search.failed', { requestId: id, error: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ error: 'No se pudo abrir el archivo.' }, { status: 503, headers: { 'X-Request-Id': id } });
  }
}
