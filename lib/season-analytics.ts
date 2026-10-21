import type { Match, MatchStat, Surface } from './types'
import { matchStat, statNumber, statFraction } from './archive-insights'
import { analyzePointTape } from './analytics/engine'
import { eligibleMatch } from './quality'
import { publishedMatchMinutes } from './duration'

export type PlayerRecord = {
  name: string
  played: number
  wins: number
  losses: number
  grandSlamWins: number
  mastersWins: number
  grandSlamFinalsWon: number
  mastersFinalsWon: number
  fiveSetWins: number
  fiveSetPlayed: number
  firstSetComebacks: number
  twoSetComebacks: number
  decidingFinalsWon: number
  semifinalsPlayed: number
  quarterfinalsPlayed: number
  opponentsBeaten: string[]
  finalsPlayed: number
  finalsWon: number
  decidingSetWins: number
  decidingSetPlayed: number
  straightSetWins: number
  sixLoveSets: number
  closeSetsWon: number
  seasons: number[]
  tournamentsWonAt: string[]
  longestWinStreak: number
  tieBreaksWon: number
  tieBreaksPlayed: number
  setsWon: number
  setsLost: number
  surfaces: Record<Surface, { played: number; wins: number }>
  stats: Record<string, { value: number; won: number; total: number; samples: number }>
  extra: Record<string, number>
  matchIds: string[]
}

const statNames = [
  'Aces', 'Double Faults', '1st serve in', '1st serve points won',
  '2nd serve points won', 'Service points won', 'Break points saved',
  'Return points won', 'Break points converted', 'Total points won',
  'Short rallies won', 'Medium rallies won', 'Long rallies won',
  'Service games won', 'Return games won', '1st return points won', '2nd return points won',
  'Second serves in', 'Golpes ganadores', 'Errores no forzados', 'Ganadores de derecha', 'Ganadores de revés',
  'Voleas ganadoras', 'Restos ganadores',
  'Remates ganadores', 'Dejadas ganadoras', 'Globos ganadores', 'Golpes de fondo ganadores', 'Errores forzados', 'Errores forzados de derecha', 'Errores forzados de revés', 'Errores forzados al resto', 'Errores forzados en remates', 'Errores forzados de fondo', 'Errores no forzados de derecha', 'Errores no forzados de revés', 'Errores no forzados en volea', 'Errores no forzados en dejadas', 'Errores no forzados en globos', 'Errores no forzados de fondo',
] as const

function statKey(name: string): string | null {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return statNames.find(candidate => candidate.toLowerCase().replace(/[^a-z0-9]/g, '') === lower) || null
}

function createRecord(name: string): PlayerRecord {
  return {
    name, played: 0, wins: 0, losses: 0, grandSlamWins: 0, mastersWins: 0,
    finalsPlayed: 0, finalsWon: 0, grandSlamFinalsWon: 0, mastersFinalsWon: 0, fiveSetWins: 0, fiveSetPlayed: 0, firstSetComebacks: 0, twoSetComebacks: 0, decidingFinalsWon: 0, semifinalsPlayed: 0, quarterfinalsPlayed: 0, opponentsBeaten: [], decidingSetWins: 0, decidingSetPlayed: 0,
    straightSetWins: 0, sixLoveSets: 0, closeSetsWon: 0, seasons: [], tournamentsWonAt: [], longestWinStreak: 0,
    tieBreaksWon: 0, tieBreaksPlayed: 0, setsWon: 0, setsLost: 0,
    surfaces: { hard: { played: 0, wins: 0 }, clay: { played: 0, wins: 0 }, grass: { played: 0, wins: 0 } },
    stats: {}, extra: {}, matchIds: [],
  }
}

function addStat(record: PlayerRecord, stat: MatchStat) {
  if (stat.period.toLowerCase() !== 'match') return
  const key = statKey(stat.name)
  if (!key) return
  const entry = record.stats[key] || { value: 0, won: 0, total: 0, samples: 0 }
  const numeric = Number(stat.value.replace('%', '').replace(',', '.'))
  if (Number.isFinite(numeric)) entry.value += numeric
  else if (stat.won !== null) entry.value += stat.won
  if (stat.won !== null && stat.total !== null) { entry.won += stat.won; entry.total += stat.total }
  entry.samples++
  record.stats[key] = entry
}

const analyses = new WeakMap<Match[], ReturnType<typeof calculateSeasonAnalytics>>()
export function buildSeasonAnalytics(matches: Match[]) {
  const saved = analyses.get(matches)
  if (saved) return saved
  const result = calculateSeasonAnalytics(matches)
  analyses.set(matches,result)
  return result
}
function calculateSeasonAnalytics(matches: Match[]) {
  const records = new Map<string, PlayerRecord>()
  const rivalries = new Map<string, { names: [string, string]; wins: [number, number]; matches: Match[] }>()
  for (const match of matches) {
    if (!eligibleMatch(match)) continue
    const names = [match.player1.name, match.player2.name] as const
    const first = records.get(names[0]) || createRecord(names[0])
    const second = records.get(names[1]) || createRecord(names[1])
    records.set(names[0], first)
    records.set(names[1], second)
    const games = match.score_summary.games
    const sets = [games.filter(([a, b]) => a > b).length, games.filter(([a, b]) => b > a).length]
    const winner = match.winner! - 1
    const isFinal = match.round.toLowerCase() === 'final'
    const deciding = games.length > 1 && Math.abs(sets[0] - sets[1]) === 1
    const tieBreaks = games.filter(([a, b]) => (a === 7 && b === 6) || (b === 7 && a === 6))
    const tapeReport = match.point_tape.length && match.quality?.tape!=='partial' ? analyzePointTape(match.point_tape) : null
    for (const [index, record] of [first, second].entries()) {
      const ex = record.extra
      const add = (key: string, n = 1) => { ex[key] = (ex[key] || 0) + n }
      const won = index === winner
      const openingWon = games[0][index] > games[0][1-index]
      add(openingWon ? 'openingWon' : 'openingLost')
      if(won) add(openingWon ? 'afterOpeningWon' : 'afterOpeningLost')
      if(games.length >= 3 && games.slice(0,2).every(set=>set[index]<set[1-index])) {add('twoDown');if(won)add('twoDownWins')}
      add('gamesWon',games.reduce((sum,set)=>sum+set[index],0));add('gamesLost',games.reduce((sum,set)=>sum+set[1-index],0))
      const rank = index===0?match.context?.rank1:match.context?.rank2
      const opponentRank = index===0?match.context?.rank2:match.context?.rank1
      const datedRank = !!match.context?.rankLabel && !/descarga/i.test(match.context.rankLabel)
      if(datedRank && opponentRank && opponentRank>0) {
        if(opponentRank<=10){add('top10Played');if(won)add('top10Wins')}
        if(opponentRank<=5){add('top5Played');if(won)add('top5Wins')}
        if(opponentRank===1){add('numberOnePlayed');if(won)add('numberOneWins')}
        if(rank && rank>opponentRank){add('underdogPlayed');if(won)add('underdogWins')}
      }
      if((publishedMatchMinutes(match)||0)>=180){add('longPlayed');if(won)add('longWins')}
      const side = (index+1) as 1|2
      const paired = (key:string,numerator:string,denominator:string) => {
        const n=statNumber(matchStat(match,side,numerator)),d=statNumber(matchStat(match,side,denominator))
        if(n!==null&&d!==null&&d>0){add(`${key}Won`,n);add(`${key}Total`,d);add(`${key}Samples`)}
      }
      paired('aceDensity','Aces','Service points played'); paired('faultDensity','Double Faults','Service points played')
      paired('breakCreated','Break points played','Return games played');paired('breakFaced','Break points faced','Service games played')
      const ownPoints=statFraction(match,side,'Total points won')?.[0]??statNumber(matchStat(match,side,'Total points won')),otherPoints=statFraction(match,side===1?2:1,'Total points won')?.[0]??statNumber(matchStat(match,side===1?2:1,'Total points won'))
      if(ownPoints!==null&&otherPoints!==null){add('pointsKnown');if(won&&ownPoints<otherPoints)add('fewerPointWins')}
      if(tapeReport){
        add('tapeSamples')
        const pressure=index===0?tapeReport.pressure.thirtyAll.first:tapeReport.pressure.thirtyAll.second
        if(pressure.leverWon){add('thirtyAllWon',pressure.gamesWonAfterLever);add('thirtyAllTotal',pressure.leverWon);add('thirtyAllSamples')}
        const secondBreak=index===0?tapeReport.pressure.breakAgainstSecondServe.first:tapeReport.pressure.breakAgainstSecondServe.second
        if(secondBreak.total){add('secondBreakWon',secondBreak.won);add('secondBreakTotal',secondBreak.total);add('secondBreakSamples')}
        const saved=match.point_tape.filter(p=>p.is_match_point===true&&p.match_point_for===3-side&&p.winner===side).length
        if(saved){add('matchPointsSaved',saved);if(won)add('matchPointRescues')}
      }

      ex.gamesTotal=(ex.gamesWon||0)+(ex.gamesLost||0)
      record.played++
      if (!record.seasons.includes(match.year)) record.seasons.push(match.year)
      record.matchIds.push(match.match_id)
      record.surfaces[match.surface].played++
      record.setsWon += sets[index]
      record.setsLost += sets[1 - index]
      if (isFinal) record.finalsPlayed++
      if (match.round.toLowerCase() === 'semifinal') record.semifinalsPlayed++
      if (match.round.toLowerCase() === 'quarterfinal') record.quarterfinalsPlayed++
      if (deciding) record.decidingSetPlayed++
      if (games.length === 5) record.fiveSetPlayed++
      record.tieBreaksPlayed += tieBreaks.length
      record.tieBreaksWon += tieBreaks.filter(([a, b]) => index === 0 ? a > b : b > a).length
      record.sixLoveSets += games.filter(set => set[index] === 6 && set[1 - index] === 0).length
      record.closeSetsWon += games.filter(set => set[index] > set[1 - index] && set[index] - set[1 - index] <= 2).length
      if (index === winner) {
        record.wins++
        record.opponentsBeaten.push(names[1 - index])
        if (games.length === 5) record.fiveSetWins++
        if (games.length >= 2 && games[0][index] < games[0][1 - index]) record.firstSetComebacks++
        if (games.length >= 3 && games.slice(0, 2).every(set => set[index] < set[1 - index])) record.twoSetComebacks++
        record.surfaces[match.surface].wins++
        if (match.category === 'Grand Slam') record.grandSlamWins++
        if (match.category === 'Masters 1000') record.mastersWins++
        if (isFinal) {
          record.finalsWon++
          if (!record.tournamentsWonAt.includes(match.tournament)) record.tournamentsWonAt.push(match.tournament)
          if (deciding) record.decidingFinalsWon++
          if (match.category === 'Grand Slam') record.grandSlamFinalsWon++
          if (match.category === 'Masters 1000') record.mastersFinalsWon++
        }
        if (deciding) record.decidingSetWins++
        if (sets[1 - index] === 0) record.straightSetWins++
      } else record.losses++
    }
    const derived:MatchStat[]=[]
    for(const side of [1,2] as const)for(const name of ['Service games won','Return games won','Service points won','Return points won','Total points won']) {
      if(matchStat(match,side,name))continue
      const fraction=statFraction(match,side,name)
      if(fraction)derived.push({player:side,period:'match',category:'Derived',name,value:String(fraction[0]),won:fraction[0],total:fraction[1]})
    }
    const seen = new Set<string>()
    ;[...match.statistics,...derived].forEach(stat => {
      const key = `${stat.player}|${stat.period.toLowerCase()}|${stat.name.toLowerCase()}`
      if(seen.has(key)) return
      seen.add(key)
      const fraction = stat.player ? statFraction(match,stat.player,stat.name) : null
      const enriched = fraction ? {...stat,won:fraction[0],total:fraction[1]} : stat
      if (stat.player === 1) addStat(first, enriched)
      if (stat.player === 2) addStat(second, enriched)
    })
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'es')) as [string, string]
    const key = sorted.join('|')
    const rivalry = rivalries.get(key) || { names: sorted, wins: [0, 0] as [number, number], matches: [] }
    rivalry.wins[sorted.indexOf(names[winner])]++
    rivalry.matches.push(match)
    rivalries.set(key, rivalry)
  }
  // A streak follows the actual match dates, independent of API pagination order.
  const streaks = new Map<string, number>()
  for (const match of [...matches].filter(eligibleMatch)
    .sort((a, b) => a.score_summary.timestamp.localeCompare(b.score_summary.timestamp) || a.match_id.localeCompare(b.match_id))) {
    for (const side of [1, 2] as const) {
      const name = side === 1 ? match.player1.name : match.player2.name
      const next = match.winner === side ? (streaks.get(name) || 0) + 1 : 0
      streaks.set(name, next)
      const record = records.get(name)
      if (record && next > record.longestWinStreak) record.longestWinStreak = next
    }
  }
  return {
    players: [...records.values()],
    rivalries: [...rivalries.values()].filter(r => r.matches.length > 1).sort((a, b) => b.matches.length - a.matches.length),
    matches: matches.filter(eligibleMatch),
  }
}

export type RankingMetric = { key: string; label: string; group: string; unit: string; min?: number; value: (record: PlayerRecord) => number | null; detail: (record: PlayerRecord) => string }
const percent = (won: number, total: number) => total ? Math.round(won / total * 100) : null
const totalStat = (r: PlayerRecord, key: string) => r.stats[key]?.samples ? r.stats[key].value : null
const rateStat = (r: PlayerRecord, key: string) => r.stats[key]?.total ? percent(r.stats[key].won, r.stats[key].total) : null
const sampleDetail = (r: PlayerRecord, key: string) => `${r.stats[key]?.samples || 0} partidos con dato`
const rateDetail = (r: PlayerRecord, key: string) => `${r.stats[key]?.won || 0} de ${r.stats[key]?.total || 0}`
const countMetric = (key: string, label: string, group: string, value: (r: PlayerRecord) => number): RankingMetric => ({ key, label, group, unit: '', value, detail: r => `${r.played} ${r.played === 1 ? 'partido' : 'partidos'} en el archivo` })
const statCount = (key: string, label: string, stat: string): RankingMetric => ({ key, label, group: 'Servicio', unit: '', value: r => totalStat(r, stat), detail: r => sampleDetail(r, stat) })
const statRate = (key: string, label: string, group: string, stat: string): RankingMetric => ({ key, label, group, unit: '%', value: r => (r.stats[stat]?.samples || 0) >= 3 && (r.stats[stat]?.total || 0) >= 20 ? rateStat(r, stat) : null, detail: r => `${rateDetail(r, stat)} · ${sampleDetail(r, stat)} (mín. 3 partidos y 20 oportunidades)` })

const measuredCount = (key:string,label:string,group:string,field:string,sample:string):RankingMetric=>({key,label,group,unit:'',value:r=>(r.extra[sample]||0)>0?r.extra[field]||0:null,detail:r=>`${r.extra[sample]||0} partidos con dato aplicable`})
const extraRate = (key:string,label:string,group:string,won:string,total:string,min=10):RankingMetric=>({key,label,group,unit:'%',min,value:r=>(r.extra[total]||0)>=min?percent(r.extra[won]||0,r.extra[total]):null,detail:r=>`${r.extra[won]||0} de ${r.extra[total]||0} casos documentados`})
const density = (key:string,label:string,group:string,field:string,min=100):RankingMetric=>({key,label,group,unit:'',min,value:r=>(r.extra[`${field}Total`]||0)>=min?Math.round(r.extra[`${field}Won`]/r.extra[`${field}Total`]*1000)/10:null,detail:r=>`${r.extra[`${field}Won`]||0} de ${r.extra[`${field}Total`]||0} · ${r.extra[`${field}Samples`]||0} partidos con dato`})

export const rankingMetrics: RankingMetric[] = [
  countMetric('wins', 'Victorias', 'Resultados', r => r.wins),
  countMetric('played', 'Partidos disputados', 'Resultados', r => r.played),
  countMetric('opponents', 'Rivales diferentes derrotados', 'Resultados', r => new Set(r.opponentsBeaten).size),
  countMetric('seasons', 'Temporadas con partidos', 'Resultados', r => r.seasons.length),


  { key: 'sets-rate', label: 'Porcentaje de sets ganados', group: 'Resultados', unit: '%', min: 20, value: r => r.setsWon+r.setsLost >= 20 ? percent(r.setsWon,r.setsWon+r.setsLost) : null, detail: r => `${r.setsWon} de ${r.setsWon+r.setsLost} sets` },
  countMetric('finals-played', 'Finales disputadas', 'Resultados', r => r.finalsPlayed),
  countMetric('sets-won', 'Sets ganados', 'Resultados', r => r.setsWon),
  { key: 'win-rate', label: 'Porcentaje de victorias', group: 'Resultados', unit: '%', min: 20, value: r => r.played >= 20 ? percent(r.wins, r.played) : null, detail: r => `${r.wins} de ${r.played} partidos` },
  countMetric('grand-slam', 'Victorias en Grand Slams', 'Resultados', r => r.grandSlamWins),
  countMetric('masters', 'Victorias en Masters 1000', 'Resultados', r => r.mastersWins),
  countMetric('finals', 'Finales ganadas', 'Resultados', r => r.finalsWon),
  { key: 'finals-rate', label: 'Porcentaje de finales ganadas', group: 'Resultados', unit: '%', min: 5, value: r => r.finalsPlayed >= 5 ? percent(r.finalsWon, r.finalsPlayed) : null, detail: r => `${r.finalsWon} de ${r.finalsPlayed} finales` },
  countMetric('slam-finals', 'Finales de Grand Slam ganadas', 'Resultados', r => r.grandSlamFinalsWon),
  countMetric('masters-finals', 'Finales de Masters ganadas', 'Resultados', r => r.mastersFinalsWon),
  countMetric('semifinals', 'Semifinales disputadas', 'Resultados', r => r.semifinalsPlayed),
  countMetric('quarterfinals', 'Cuartos de final disputados', 'Resultados', r => r.quarterfinalsPlayed),
  countMetric('straight-sets', 'Victorias sin perder sets', 'Resultados', r => r.straightSetWins),
  countMetric('six-love-sets', 'Sets ganados 6–0', 'Resultados', r => r.sixLoveSets),
  countMetric('close-sets', 'Sets ajustados ganados', 'Presión', r => r.closeSetsWon),
  { key: 'straight-set-rate', label: 'Victorias sin ceder un set', group: 'Resultados', unit: '%', min: 5, value: r => r.wins >= 5 ? percent(r.straightSetWins, r.wins) : null, detail: r => `${r.straightSetWins} de ${r.wins} victorias` },
  countMetric('five-set-wins', 'Victorias en cinco sets', 'Presión', r => r.fiveSetWins),
  countMetric('first-set-comebacks', 'Remontadas tras perder el primer set', 'Presión', r => r.firstSetComebacks),
  countMetric('two-set-comebacks', 'Remontadas tras perder dos sets', 'Presión', r => r.twoSetComebacks),
  countMetric('deciding-finals', 'Finales ganadas en el set decisivo', 'Presión', r => r.decidingFinalsWon),
  { key: 'five-set-rate', label: 'Porcentaje de victorias en cinco sets', group: 'Presión', unit: '%', min: 5, value: r => r.fiveSetPlayed >= 5 ? percent(r.fiveSetWins, r.fiveSetPlayed) : null, detail: r => `${r.fiveSetWins} de ${r.fiveSetPlayed} partidos a cinco sets` },
  { key: 'deciding-rate', label: 'Porcentaje de sets decisivos ganados', group: 'Presión', unit: '%', min: 10, value: r => r.decidingSetPlayed >= 10 ? percent(r.decidingSetWins, r.decidingSetPlayed) : null, detail: r => `${r.decidingSetWins} de ${r.decidingSetPlayed} partidos` },
  { key: 'deciders', label: 'Sets decisivos ganados', group: 'Presión', unit: '', value: r => r.decidingSetPlayed ? r.decidingSetWins : null, detail: r => `${r.decidingSetWins} de ${r.decidingSetPlayed}` },
  { key: 'tiebreaks', label: 'Tie breaks ganados', group: 'Presión', unit: '', value: r => r.tieBreaksPlayed ? r.tieBreaksWon : null, detail: r => `${r.tieBreaksWon} de ${r.tieBreaksPlayed}` },
  { key: 'tiebreak-rate', label: 'Porcentaje de tie breaks ganados', group: 'Presión', unit: '%', min: 10, value: r => r.tieBreaksPlayed >= 10 ? percent(r.tieBreaksWon, r.tieBreaksPlayed) : null, detail: r => `${r.tieBreaksWon} de ${r.tieBreaksPlayed} tie breaks` },
  statRate('break-conversion', 'Puntos de ruptura convertidos', 'Presión', 'Break points converted'),
  statRate('break-saved', 'Puntos de ruptura salvados', 'Presión', 'Break points saved'),
  statCount('aces', 'Saques directos', 'Aces'),
  { key: 'aces-per-match', label: 'Saques directos por partido', group: 'Servicio', unit: '', min: 3, value: r => r.stats.Aces?.samples >= 3 ? Math.round(r.stats.Aces.value / r.stats.Aces.samples * 10) / 10 : null, detail: r => `${r.stats.Aces?.value || 0} saques directos en ${r.stats.Aces?.samples || 0} partidos` },
  statCount('double-faults', 'Más dobles faltas', 'Double Faults'),
  statRate('first-in', 'Primeros saques dentro', 'Servicio', '1st serve in'),
  statRate('first-won', 'Puntos con primer saque', 'Servicio', '1st serve points won'),
  statRate('second-won', 'Puntos con segundo saque', 'Servicio', '2nd serve points won'),
  statRate('service-won', 'Puntos ganados al saque', 'Servicio', 'Service points won'),
  statRate('return-won', 'Puntos ganados al resto', 'Resto y rallies', 'Return points won'),
  { key: 'total-points', label: 'Puntos totales ganados', group: 'Resto y rallies', unit: '', value: r => totalStat(r, 'Total points won'), detail: r => sampleDetail(r, 'Total points won') },
  statRate('short-rallies', 'Rallies de 1 a 4 golpes', 'Resto y rallies', 'Short rallies won'),
  statRate('medium-rallies', 'Rallies de 5 a 8 golpes', 'Resto y rallies', 'Medium rallies won'),
  statRate('long-rallies', 'Rallies de 9+ golpes', 'Resto y rallies', 'Long rallies won'),

  countMetric('games-won', 'Juegos ganados', 'Resultados', r=>r.extra.gamesWon||0),
  extraRate('games-rate','Porcentaje de juegos ganados','Resultados','gamesWon','gamesTotal',100),
  extraRate('opening-lead','Victorias tras ganar el primer set','Presión','afterOpeningWon','openingWon'),
  extraRate('opening-recovery','Eficacia tras perder el primer set','Presión','afterOpeningLost','openingLost'),
  extraRate('two-down-recovery','Eficacia desde 0–2 en sets','Presión','twoDownWins','twoDown',5),
  measuredCount('top10-wins','Victorias ante el top 10','Contexto','top10Wins','top10Played'),
  extraRate('top10-rate','Victorias ante el top 10 (%)','Contexto','top10Wins','top10Played'),
  measuredCount('top5-wins','Victorias ante el top 5','Contexto','top5Wins','top5Played'),
  measuredCount('number-one-wins','Victorias ante el número uno','Contexto','numberOneWins','numberOnePlayed'),
  extraRate('underdog-rate','Victorias con peor ranking','Contexto','underdogWins','underdogPlayed'),
  measuredCount('long-wins','Victorias en tres horas o más','Contexto','longWins','longPlayed'),
  extraRate('long-rate','Victorias en partidos de tres horas (%)','Contexto','longWins','longPlayed',5),
  measuredCount('fewer-points','Ganar sumando menos puntos','Presión','fewerPointWins','pointsKnown'),
  measuredCount('matchpoint-rescues','Victorias salvando bola de partido','Presión','matchPointRescues','tapeSamples'),
  measuredCount('matchpoints-saved','Bolas de partido salvadas','Presión','matchPointsSaved','tapeSamples'),
  extraRate('thirty-all-games','Juegos cerrados tras ganar el 30–30','Presión','thirtyAllWon','thirtyAllTotal'),
  extraRate('second-serve-breaks','Breaks ante segundo saque','Presión','secondBreakWon','secondBreakTotal',5),
  density('aces-per-100','Aces por 100 puntos de saque','Servicio','aceDensity'),
  density('faults-per-100','Dobles faltas por 100 puntos de saque','Servicio','faultDensity'),
  density('chances-per-100','Bolas de break por 100 juegos al resto','Resto y rallies','breakCreated',20),
  density('faced-per-100','Bolas de break afrontadas por 100 juegos al saque','Servicio','breakFaced',20),
  statRate('holds','Juegos de saque conservados','Servicio','Service games won'),
  statRate('return-games','Juegos ganados al resto','Resto y rallies','Return games won'),
  statRate('first-return','Resto ante primeros saques','Resto y rallies','1st return points won'),
  statRate('second-return','Resto ante segundos saques','Resto y rallies','2nd return points won'),
  statRate('second-in','Segundos saques dentro','Servicio','Second serves in'),
  ...[['winners','Golpes ganadores'],['unforced','Errores no forzados'],['forehand','Ganadores de derecha'],['backhand','Ganadores de revés'],['volley','Voleas ganadoras'],['return-winners','Restos ganadores']].map(([key,label])=>({...statCount(key,label,label),group:'Golpes'})),
  ...(['hard', 'clay', 'grass'] as const).flatMap((surface) => {
    const label = surface === 'hard' ? 'pista dura' : surface === 'clay' ? 'tierra batida' : 'hierba'
    return [
      countMetric(`${surface}-wins`, `Victorias en ${label}`, 'Superficies', r => r.surfaces[surface].wins),
      { key: `${surface}-rate`, label: `Porcentaje de victorias en ${label}`, group: 'Superficies', unit: '%', min: 10, value: (r: PlayerRecord) => r.surfaces[surface].played >= 10 ? percent(r.surfaces[surface].wins, r.surfaces[surface].played) : null, detail: (r: PlayerRecord) => `${r.surfaces[surface].wins} de ${r.surfaces[surface].played} partidos` } satisfies RankingMetric,
    ]
  }),
]

export function leaders(players: PlayerRecord[], metric: RankingMetric, limit = 5) {
  return players.map(player => ({ player, value: metric.value(player) }))
    .filter((entry): entry is { player: PlayerRecord; value: number } => entry.value !== null && (metric.unit === '%' || entry.value > 0))
    .sort((a, b) => b.value - a.value || b.player.played - a.player.played || a.player.name.localeCompare(b.player.name, 'es'))
    .slice(0, limit)
}
