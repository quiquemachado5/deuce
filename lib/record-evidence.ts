import type { Match } from './types';
import type { RecordRow } from './revista/records';
import { eligibleMatch } from './quality';
import { chronological, winnerName } from './editorial';
import { lostOpening, isDeciding, statFraction, statNumber, matchStat } from './archive-insights';
import { shelves, measuredKeys } from './cuaderno/shelves';
import { tournamentName } from './labels';
import { analyzePointTape } from './analytics/engine';
import { isRecordedTiebreak } from './historical-rules';
import { archiveIndex } from './archive-index';
import { additionalRecordEvidence } from './revista/additional-records';
import { densityFields, hasDensityPair } from './metric-density';
const eligibleSets = new WeakMap<Match[],Match[]>();

export function evidenceHref(id: string, row: RecordRow, filters: Record<string,string|undefined> = {}) {
  const q = new URLSearchParams({dato:id,nombre:row.name,detalle:row.detail,entrada:row.href});
  for (const key of ['year','surface','competition','era']) if (filters[key] && filters[key] !== 'all') q.set(key,filters[key]!);
  return '/records/evidencia?' + q;
}
const final = (m:Match) => m.round.toLowerCase() === 'final';
/** Exact, contiguous winning/losing run. An invalid result interrupts the run. */
export function bestRun(matches: Match[], name: string, won = true) {
  let current:Match[] = [], best:Match[] = [];
  for (const m of [...matches].sort(chronological)) {
    if (m.player1.name !== name && m.player2.name !== name) continue;
    if (eligibleMatch(m) && (winnerName(m) === name) === won) current.push(m);
    else current = [];
    if (current.length > best.length) best = [...current];
  }
  return best;
}
/** Lists the contributing matches, not an arbitrary example or an inferred career total. */
export function recordEvidence(matches: Match[], id: string, row: RecordRow): { matches: Match[]; note: string } {
  let valid = eligibleSets.get(matches);
  if(!valid) {valid = matches.filter(eligibleMatch);eligibleSets.set(matches,valid);}
  const name = row.name;
  const subject = archiveIndex(valid).players.get(name) || [];
  const side = (m:Match):1|2 => m.player1.name === name ? 1 : 2;
  const win = (m:Match) => winnerName(m) === name;
  let result: Match[];
  let note = 'Cada encuentro aparece una sola vez. Abre el partido para consultar su marcador y los datos disponibles.';
  const additional = additionalRecordEvidence(id, subject, name);
  if (row.href.startsWith('/match/')) result = valid.filter(m => '/match/' + m.match_id === row.href);
  else if (additional) {
    result = additional;
    note = 'Encuentros que aportan casos al cálculo. La cifra puede contar sets, juegos, rivales o temporadas, no partidos. Los porcentajes incluyen victorias y derrotas aplicables; consulta la división de la clasificación.';
  }
  else if (id === 'parejas' || id === 'parejas-finales') {
    const names = row.name.split(' – ');
    result = valid.filter(m => names.includes(m.player1.name) && names.includes(m.player2.name) && (id !== 'parejas-finales' || final(m)));
  } else if (id === 'rachas' || id.startsWith('finales-seguidas-')) {
    result = bestRun(id === 'rachas' ? matches : matches.filter(final), name, id !== 'finales-seguidas-perdidas');
    note = 'Tramo consecutivo que alcanza esta cifra. Un resultado inválido interrumpe la racha. Fechas de inicio de torneo se ordenan por ronda; no equivalen al día exacto del partido. Los partidos ausentes no pueden reconstruirse.';
  } else if (['finales-ganadas','finales-jugadas','efectividad-finales'].includes(id)) {
    result = subject.filter(m => final(m) && (id !== 'finales-ganadas' || win(m)));
  } else if (['ganar-menos-juegos','remontar-rosco','finales-cuatro-juegos'].includes(id)) {
    result = subject.filter(m => win(m) && (id === 'ganar-menos-juegos'
      ? m.score_summary.games.reduce((n,s)=>n+s[side(m)-1]-s[2-side(m)],0)<0
      : id === 'remontar-rosco' ? m.score_summary.games.some(s=>s[side(m)-1]===0&&s[2-side(m)]===6)
      : final(m)&&m.score_summary.games.reduce((n,s)=>n+s[2-side(m)],0)<=4));
  } else if (id === 'finales-remontadas-primer-set') {
    result = subject.filter(m => final(m) && win(m) && lostOpening(m));
  } else if (id.startsWith('titulos-') || id.startsWith('masters-')) {
    result = subject.filter(m => final(m) && win(m));
    if (id === 'titulos-torneo' || id === 'titulos-un-masters') result = result.filter(m => tournamentName(m.tournament) === row.detail);
    if (id.includes('masters')) result = result.filter(m => m.category === 'Masters 1000' && m.year >= 1990);
    const surface = id.split('-').at(-1);
    if (['hard','clay','grass','carpet'].includes(surface!)) result = result.filter(m => m.surface === surface);
  } else if (/^atp-(250|500)-/.test(id)) {
    const category = id.startsWith('atp-250') ? 'ATP 250' : 'ATP 500';
    result = subject.filter(m => m.category === category && m.year >= 2023 && (id.endsWith('victorias') || final(m)) && (id.endsWith('finales') || win(m)));
    if (id.endsWith('un-torneo')) result = result.filter(m => tournamentName(m.tournament) === row.detail);
  } else if (['victorias-temporada','temporadas-finales','temporadas-titulos'].includes(id)) {
    result = subject.filter(m => String(m.year) === row.detail && (id === 'victorias-temporada' || final(m)) && (id === 'temporadas-finales' || win(m)));
  } else if (id === 'victorias' || id.startsWith('victorias-') && ['hard','clay','grass','carpet'].includes(id.slice(10))) {
    result = subject.filter(m => win(m) && (id === 'victorias' || m.surface === id.slice(10)));
  } else if (['top-10','top-5','numero-uno'].includes(id)) {
    const limit = id === 'top-10' ? 10 : id === 'top-5' ? 5 : 1;
    result = subject.filter(m => {const rank = side(m) === 1 ? m.context?.rank2 : m.context?.rank1; return win(m) && m.context?.rankLabel === 'Ranking al jugar' && !!rank && rank > 0 && rank <= limit;});
  } else if (id === 'sin-ceder-set') result = subject.filter(m => win(m) && m.score_summary.sets.some(n => n === 0));
  else if (id === 'seis-cero') result = subject.filter(m => m.score_summary.games.some(g => g[side(m)-1] === 6 && g[2-side(m)] === 0));
  else if (id === 'bajo-techo' || id === 'aire-libre') result = subject.filter(m => win(m) && m.context?.indoor === (id === 'bajo-techo'));
  else if (id.startsWith('remontada-')) result = subject.filter(m => win(m) && lostOpening(m,id === 'remontada-dos-sets' ? 2 : 1));
  else if (id === 'victorias-cinco-sets' || id === 'porcentaje-cinco-sets') result = subject.filter(m => m.score_summary.games.length === 5 && (id === 'porcentaje-cinco-sets' || win(m)));
  else if (id === 'sets-decisivos') result = subject.filter(m => win(m) && isDeciding(m));
  else if (id === 'tie-breaks') {
    result = subject.filter(m => m.score_summary.games.some((g,index) => isRecordedTiebreak(m,index) && g[side(m)-1] > g[2-side(m)]));
    note = 'La cifra cuenta tie-breaks ganados, no partidos: un partido puede aportar más de uno. Los marcadores de cada set permiten comprobar la suma.';
  } else {
    const reliable = subject.filter(m => m.quality?.tape === 'reliable');
    if (id === 'bolas-partido-salvadas') result = reliable.filter(m => m.point_tape.some(p => p.is_match_point && p.match_point_for === 3-side(m) && p.winner === side(m)));
    else if (id === '30-30') result = reliable.filter(m => analyzePointTape(m.point_tape).pressure.thirtyAll[side(m) === 1 ? 'first':'second'].leverWon > 0);
    else if (id === 'break-tras-fallo') result = reliable.filter(m => m.point_tape.some(p => p.server === side(m) && p.is_break_point && p.first_serve_in === false));
    else {
      const shelf = shelves.find(s => s.id === id), key = shelf?.metric?.key;
      const stat = id === 'breaks-convertidos' ? 'Break points converted' : id === 'breaks-salvados' ? 'Break points saved' : key ? measuredKeys[key] || (key.startsWith('golpes-') ? shelf!.label : undefined) : undefined;
      const source = ['breaks-convertidos','breaks-salvados'].includes(id) ? reliable : subject;
      if (key && densityFields[key]) result = source.filter(m => hasDensityPair(m, side(m), key));
      else if (stat) result = source.filter(m => statFraction(m,side(m),stat)?.[1] || statNumber(matchStat(m,side(m),stat)) !== null);
      else if (shelf?.metric) result = reliable.filter(m => m.point_tape.some(p => p.server === 3-side(m) && p.is_break_point && p.first_serve_in === false));
      else throw new Error(`No evidence selector for ${id}`);
    }
    note = 'Estos partidos aportan observaciones al cálculo. La muestra puede contar puntos, juegos u oportunidades, no partidos. Consulta la división de la clasificación y la estadística publicada en cada encuentro; no se rellenan ausencias con ceros.';
  }
  return {matches:[...new Map(result.map(m => [m.match_id,m])).values()].sort(chronological),note};
}
