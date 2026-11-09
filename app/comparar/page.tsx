import Link from 'next/link';
import { preparedCompactSelection, preparedEloProducts, preparedMatchBrowserIndex, preparedPlayerRecords } from '@/lib/revista/read-records';
import { eloPlayer } from '@/lib/archive-products';
import { comparePlayer, comparisonHeadToHead, comparisonLeadTimeline, comparisonPlayerWon, sharedCareerWindow } from '@/lib/player-comparison';
import { playerPhoto } from '@/lib/player-imagery';
import { playerIdentity, playerSlug } from '@/lib/explore';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { number } from '@/lib/cuaderno/model';
import { normalizeText } from '@/lib/quality';
import PlayerInput from '@/components/PlayerInput';
import CompareSelection, { CompareSampleFilters } from './CompareSelection';
import PlayerFlag from '@/components/PlayerFlag';
import { playerBiography } from '@/lib/player-bio';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import { toMatchRecord } from '@/data/map-match';
import TournamentFilters from '@/components/TournamentFilters';
import { SlidersHorizontal } from 'lucide-react';
import styles from './compare.module.css';

const baseMetadata = {
  title: 'Comparador de jugadores — DEUCE',
  description: 'Compara dos jugadores del archivo DEUCE por trayectoria, rendimiento, superficie y enfrentamientos directos.',
  alternates: { canonical: '/comparar' },
  openGraph: {
    title: 'Comparador de jugadores — DEUCE',
    description: 'Trayectoria, superficies y cara a cara de dos jugadores en una lectura común.',
    url: '/comparar',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Comparador de jugadores — DEUCE',
    description: 'Trayectoria, superficies y cara a cara de dos jugadores en una lectura común.',
    images: ['/opengraph-image'],
  },
  robots: { index: false, follow: true },
};
export async function generateMetadata({searchParams}:{searchParams:Promise<Query>}) {
  const q=await searchParams, tour=q.tour==='wta'?'wta':'atp';
  const params=new URLSearchParams({...(tour==='wta'?{tour}:{}),...(q.a?{a:q.a}:{}),...(q.b?{b:q.b}:{})});
  const canonical=`/comparar${params.size?`?${params}`:''}`;
  const title=tour==='wta'?'Comparador de jugadoras WTA — DEUCE':'Comparador de jugadores ATP — DEUCE';
  const description=tour==='wta'
    ? 'Compara dos jugadoras WTA del archivo DEUCE por trayectoria, rendimiento, superficie y enfrentamientos directos.'
    : baseMetadata.description;
  return {...baseMetadata,title,description,alternates:{canonical,languages:{es:canonical,en:`/en/compare${tour==='wta'?'?tour=wta':''}`}},openGraph:{...baseMetadata.openGraph,title,description,url:canonical},twitter:{...baseMetadata.twitter,title,description}};
}
export const revalidate = 300;
type Query = Record<string, string | undefined>;

export default async function Compare({ searchParams }: { searchParams: Promise<Query> }) {
  const q = { ...await searchParams };
  const tour=q.tour==='wta'?'wta':'atp';
  q.tour=tour;
  const [playerArchive,browser,elo]=await Promise.all([preparedPlayerRecords(),preparedMatchBrowserIndex(),preparedEloProducts()]);
  const recordSource=playerArchive.records.filter(p=>(p.tour||'atp')===tour);
  const circuitYears=browser.index.circuits[tour].years;
  if(q.year&&q.year!=='all'&&!circuitYears.includes(Number(q.year)))q.year='all';
  const names = recordSource.map(player=>player.name).sort((a,b) => a.localeCompare(b,'es'));
  const defaultNames=[...recordSource]
    .sort((a,b)=>b.grandSlamFinalsWon-a.grandSlamFinalsWon||b.wins-a.wins||b.played-a.played||a.name.localeCompare(b.name,'es'))
    .map(player=>player.name);
  const resolvePlayer = (value: string) => {
    const exact = names.find(name => playerSlug(name) === playerSlug(value) || normalizeText(name) === normalizeText(value));
    if (exact) return exact;
    const token = normalizeText(value).replace(/-/g, ' ').trim();
    const surnames = names.filter(name => normalizeText(name).split(/\s+/).at(-1) === token);
    return surnames.length === 1 ? surnames[0] : '';
  };
  const firstRequested = q.a || (tour==='wta'?defaultNames[0]||'':'Novak Djokovic');
  const firstResolved = resolvePlayer(firstRequested);
  const defaultSecond = playerSlug(firstResolved || firstRequested) === playerSlug('Rafael Nadal') ? 'Novak Djokovic' : 'Rafael Nadal';
  const requested = [firstRequested, q.b || (tour==='wta'?defaultNames.find(name=>name!==firstResolved)||'':defaultSecond)];
  const resolved = [firstResolved, resolvePlayer(requested[1])];
  const chosen = requested.map((name, index) => resolved[index] || name);
  const chosenIdentities=chosen.map(name=>playerIdentity(name,tour));
  const same = chosenIdentities[0] === chosenIdentities[1], valid = resolved.every(Boolean);
  const canCompare = valid && !same;
  const chosenRecords=resolved.map(name=>recordSource.find(record=>playerIdentity(record.name,tour)===playerIdentity(name,tour)));
  const documentedYears=chosenRecords.flatMap(record=>record?.seasons||[]);
  const defaultFrom=documentedYears.length?Math.min(...documentedYears):Math.min(...circuitYears);
  const defaultTo=documentedYears.length?Math.max(...documentedYears):Math.max(...circuitYears);
  const fromYear=Number(q.fromYear)||defaultFrom,toYear=Number(q.toYear)||defaultTo;
  const selectedYear=q.year&&q.year!=='all'?Number(q.year):undefined;
  const matches=canCompare?await preparedCompactSelection({tour,players:resolved,fromYear:selectedYear||fromYear,toYear:selectedYear||toYear}):[];
  const chosenIdentitySet=new Set(chosenIdentities);
  const relevantMatches=matches.filter(match=>(match.tour||'atp')===tour&&(chosenIdentitySet.has(playerIdentity(match.player1.name,tour))||chosenIdentitySet.has(playerIdentity(match.player2.name,tour))));
  const periodMatches=relevantMatches.filter(match=>match.year>=fromYear&&match.year<=toYear);
  const window = canCompare ? sharedCareerWindow(periodMatches, chosen, tour) : null;
  const cohort = canCompare ? (q.period === 'shared' ? (window ? periodMatches.filter(m=>m.year>=window.first&&m.year<=window.last) : []) : periodMatches) : [];
  const players = canCompare ? chosen.map(name => comparePlayer(cohort, name, q, tour)) : [];
  const eloPlayers=canCompare?chosen.map(name=>eloPlayer(elo,name,tour)):[];
  const eloPoint=(index:number,year:number)=>eloPlayers[index]?.years.filter(row=>row[0]<=year).at(-1);
  const periodElo=eloPlayers.map((_,index)=>eloPoint(index,toYear)?.[1]??null);
  const periodEloChange=eloPlayers.map((_,index)=>{const end=eloPoint(index,toYear)?.[1],start=eloPoint(index,fromYear-1)?.[1]??1500;return end===undefined?null:Math.round((end-start)*10)/10;});
  const periodEloSample=eloPlayers.map((_,index)=>(eloPoint(index,toYear)?.[2]??0)-(eloPoint(index,fromYear-1)?.[2]??0));
  const sufficient = canCompare && players.every(p => p.sufficient);
  const minimum = ['5','20','50'].includes(q.minimum || '') ? q.minimum! : '20';
  const activeSampleFilters = [q.period && q.period !== 'career', q.year && q.year !== 'all', q.fromYear, q.toYear, q.surface && q.surface !== 'all', q.competition && q.competition !== 'all', q.age && q.age !== 'all', q.minimum && q.minimum !== '20'].filter(Boolean).length;
  const metrics = [
    { label: 'Victorias', values: players.map(player => player.won), percent: false, lowerIsBetter: false },
    { label: 'Derrotas', values: players.map(player => player.lost), percent: false, lowerIsBetter: true },
    { label: 'Efectividad', values: players.map(player => player.rate), percent: true, lowerIsBetter: false },
    { label: 'Títulos del archivo', values: players.map(player => player.titles), percent: false, lowerIsBetter: false },
    { label: 'Finales jugadas', values: players.map(player => player.finals), percent: false, lowerIsBetter: false },
    { label: 'Victorias ante top 10', values: players.map(player => player.top10Won), percent: false, lowerIsBetter: false },
    { label: 'DEUCE Elo', values: periodElo, percent: false, lowerIsBetter: false },
    { label: 'Cambio Elo en el periodo', values: periodEloChange, percent: false, lowerIsBetter: false },
    { label: 'Elo medio de rivales · carrera', values: eloPlayers.map(player=>player?.averageOpponentRating??null), percent: false, lowerIsBetter: false },
    { label: 'Victorias sobre expectativa · carrera', values: eloPlayers.map(player=>player?.winsAboveExpected??null), percent: false, lowerIsBetter: false },
  ];
  const metricGroups = [
    { title: 'Trayectoria', rows: metrics.slice(0, 3) },
    { title: 'Rendimiento', rows: metrics.slice(3) },
  ];
  const directMatches = canCompare
    ? comparisonHeadToHead(matches,chosen,players.map(player=>player.matches),tour)
    : [];
  const directWins = canCompare ? chosen.map(name => directMatches.filter(match => comparisonPlayerWon(match,name,tour)).length) : [0, 0];
  const leadTimeline=canCompare?comparisonLeadTimeline(directMatches,chosen,tour):[];
  const leadChange=leadTimeline.findLast(point=>point.leaderChanged);
  const compareHref = (changes: Query) => {
    const params = new URLSearchParams();
    Object.entries({ ...q, a: chosen[0], b: chosen[1], ...changes }).forEach(([key,value]) => { if (value && value !== 'all' && !(key==='tour'&&value==='atp')) params.set(key,value); });
    const search=params.toString();
    return `/comparar${search?`?${search}`:''}`;
  };
  const surfacesToShow = q.surface && q.surface !== 'all' ? SURFACES.filter(surface => surface === q.surface) : SURFACES.filter(surface => surface !== 'unknown');

  return <div className={`${styles.page} nc-wrap dx-comparison deuce-comparison`}>
    <header className={`inner-title ${styles.intro}`}><h1>Comparar</h1><div className="inner-title-tools">
      <div className={styles.desktopCircuit}><TournamentFilters ariaLabel="Circuito del comparador" items={[
        {href:'/comparar',label:'ATP',active:tour==='atp'},
        {href:'/comparar?tour=wta',label:'WTA',active:tour==='wta'},
      ]}/></div>
      <details className={styles.mobileFilterMenu}><summary><span>Filtros</span><SlidersHorizontal size={18} aria-hidden="true"/></summary><div><TournamentFilters ariaLabel="Circuito del comparador" items={[
        {href:'/comparar',label:'ATP',active:tour==='atp'},
        {href:'/comparar?tour=wta',label:'WTA',active:tour==='wta'},
      ]}/><a href="#player-comparison-form">Jugadores y muestra</a></div></details>
    </div></header>
    <CompareSelection key={chosen.join('|')} tour={tour} initial={chosen.map(name => {
      const photo = playerPhoto(name,q.tour==='wta'?'wta':'atp');
      const hasThumbnail = Boolean(photo?.thumbnail);
      return { name, country: playerBiography(name,q.tour==='wta'?'wta':'atp')?.country, photo: photo ? {
        src: photo.thumbnail || photo.src,
        objectPosition: hasThumbnail ? '50% 20%' : photo.objectPosition,
        avatarCrop: hasThumbnail ? undefined : photo.avatarCrop,
      } : undefined };
    })}>
      {tour==='wta'?<input type="hidden" name="tour" value="wta"/>:null}
      {['a','b'].map((key,index) => {
        const label=`${tour==='wta'?'Jugadora':'Jugador'} ${index+1}`;
        return <div className="nc-field" key={key}><span>{label}</span><PlayerInput tour={tour} key={chosen[index]} name={key} initial={chosen[index]} label={label} /></div>;
      })}
      <CompareSampleFilters summary={activeSampleFilters ? `${activeSampleFilters} activos` : 'Valores generales'}>
        <label className="nc-field"><span>Periodo de comparación</span><select name="period" defaultValue={q.period || "career"}><option value="career">Carrera documentada</option><option value="shared">Periodo compartido</option></select></label>
        <label className="nc-field"><span>Temporada</span><select name="year" defaultValue={q.year || 'all'}><option value="all">Todas</option>{circuitYears.map(year => <option key={year}>{year}</option>)}</select></label>
        <label className="nc-field"><span>Desde</span><select name="fromYear" defaultValue={String(fromYear)}>{[...circuitYears].sort((a,b)=>a-b).map(year=><option key={year}>{year}</option>)}</select></label>
        <label className="nc-field"><span>Hasta</span><select name="toYear" defaultValue={String(toYear)}>{circuitYears.map(year=><option key={year}>{year}</option>)}</select></label>
        <label className="nc-field"><span>Superficie</span><select name="surface" defaultValue={q.surface || 'all'}><option value="all">Todas</option>{SURFACES.map(s => <option value={s} key={s}>{surfaceLabel[s]}</option>)}</select></label>
        <label className="nc-field"><span>Competición</span><select name="competition" defaultValue={q.competition || 'all'}><option value="all">Todas</option>{[...new Set(relevantMatches.map(m => m.category))].sort().filter(category => !/nivel no especificado/.test(category)).map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="nc-field"><span>Edad al jugar</span><select name="age" defaultValue={q.age || 'all'}><option value="all">Todas las edades</option>{[['14-17','14–17'],['18-21','18–21'],['22-25','22–25'],['26-29','26–29'],['30-34','30–34'],['35+','35 o más']].map(([value,label]) => <option key={value} value={value}>{label} años</option>)}</select></label>
        <label className="nc-field"><span>Muestra mínima</span><select name="minimum" defaultValue={minimum}>{[5,20,50].map(n => <option key={n} value={n}>{n} partidos</option>)}</select></label>
      </CompareSampleFilters>
      <button className="dx-button" type="submit">Comparar</button>
    </CompareSelection>
    {!valid ? <p role="status" className="dx-notice">Selecciona dos nombres del archivo. No hay resultados para {chosen.filter(n => !names.includes(n)).join(', ')}.</p> : same ? <p role="status" className="dx-notice">Has elegido {tour==='wta'?'la misma jugadora':'el mismo jugador'}. Selecciona {tour==='wta'?'dos jugadoras distintas':'dos jugadores distintos'} para construir una comparación.</p> : <>
      {!sufficient && <p role="status" className="dx-notice">La muestra no alcanza el mínimo elegido; las cifras se muestran sin declarar una ventaja.</p>}
      <section className={styles.comparisonBoard} id="comparison" aria-labelledby="comparison-table-title">
        <h2 id="comparison-table-title" className="nc-sr">Comparación métrica</h2>
        <div className={styles.comparisonHeader}>
          {players.map((player, index) => {
            const country = playerBiography(player.name,q.tour==='wta'?'wta':'atp')?.country;
            return <Link className={styles.playerHeading} data-side={index === 0 ? 'left' : 'right'} data-has-country={country?'true':'false'} href={`/jugadores/${playerSlug(player.name)}${tour === 'wta' ? '?tour=wta' : ''}`} key={player.name}>
              <span className={styles.flag}><PlayerFlag code={country}/></span>
              <strong>{player.name}</strong>
            </Link>;
          })}
          <span className={styles.comparisonLabel}>Comparativa</span>
        </div>
        <div className={styles.statGroups} aria-label={`Comparación entre ${chosen[0]} y ${chosen[1]}`}>
          {metricGroups.map(group => <article className={styles.statGroup} key={group.title}>
            <h3>{group.title}</h3>
            <div className={styles.statNames}><span>{chosen[0]}</span><span>{chosen[1]}</span></div>
            <table className={styles.statTable}>
              <caption className="nc-sr">{group.title}: {chosen[0]} frente a {chosen[1]}</caption>
              <thead className="nc-sr"><tr><th scope="col">{chosen[0]}</th><th scope="col">Métrica</th><th scope="col">{chosen[1]}</th></tr></thead>
              <tbody>
              {group.rows.map(metric => {
                const [a,b] = metric.values;
                const leader = sufficient && typeof a === 'number' && typeof b === 'number' && a !== b ? ((a > b) !== metric.lowerIsBetter ? chosen[0] : chosen[1]) : '';
                const format = (value: number | null) => value === null ? '—' : `${number(value, metric.percent ? 1 : undefined)}${metric.percent ? ' %' : ''}`;
                return <tr key={metric.label}>
                  <td className={leader === chosen[0] ? styles.statWinner : undefined}>{format(a)}</td>
                  <th scope="row">{metric.label}</th>
                  <td className={leader === chosen[1] ? styles.statWinner : undefined}>{format(b)}</td>
                </tr>;
              })}
              </tbody>
            </table>
          </article>)}
        </div>
        <section className={styles.surfaceComparison} aria-labelledby="surface-comparison-title">
          <h3 id="surface-comparison-title">Rendimiento por superficie</h3>
          <div className={styles.surfaceGrid}>
            {surfacesToShow.map((surface) => {
              const results=players.map(player=>player.surfaces.find(entry=>entry.surface===surface)!);
              const leadingIndex=results.every(result=>result.played)&&results[0].rate!==results[1].rate
                ? Number((results[1].rate||0)>(results[0].rate||0))
                : -1;
              return <article className={styles.surfaceCard} data-surface={surface} key={surface}>
                <h4>{surfaceLabel[surface]}</h4>
                {players.map((player,index)=>{
                  const result=results[index];
                  return <div className={styles.surfacePlayer} data-leading={leadingIndex===index?'true':undefined} key={player.name}>
                    <span><strong>{player.name}</strong><b>{result.played?`${number(result.rate!,1)} %`:'—'}</b></span>
                    <span className={styles.surfaceTrack} aria-hidden="true"><i style={{width:`${result.rate||0}%`}}/></span>
                    <small>{result.played?`${number(result.won)} victorias · ${number(result.played-result.won)} derrotas`:'Sin partidos'}</small>
                  </div>;
                })}
              </article>;
            })}
          </div>
        </section>
        <p className={styles.eloNote}>{elo.method} Muestra del periodo: {chosen.map((name,index)=>`${name}, ${number(periodEloSample[index])} partidos (${periodEloSample[index]>=50?'consolidada':periodEloSample[index]>=20?'en desarrollo':'provisional'})`).join(' · ')}. La etiqueta describe volumen, no certeza estadística.</p>
        <nav className={styles.scopeNav} aria-label="Comparar por competición">
          <span>Competición</span>
          {[
            ['all', 'Todas'],
            ['Grand Slam', 'Grand Slam'],
            [tour==='wta'?'WTA 1000':'Masters 1000', tour==='wta'?'WTA 1000':'Masters 1000'],
            [tour==='wta'?'WTA 500':'ATP 500', tour==='wta'?'WTA 500':'ATP 500'],
            [tour==='wta'?'WTA 250':'ATP 250', tour==='wta'?'WTA 250':'ATP 250'],
          ].map(([value, label]) => <Link href={`${compareHref({competition:value})}#comparison`} scroll={false} aria-current={(q.competition || 'all') === value ? 'page' : undefined} key={value}>{label}</Link>)}
        </nav>
      </section>
      <section className={styles.headToHead} id="cara-a-cara" aria-labelledby="head-to-head-title">
        <div className={styles.h2hHeading}><h2 id="head-to-head-title">Cara a cara</h2><span>{number(directMatches.length)} {directMatches.length === 1 ? 'partido' : 'partidos'}</span></div>
        <div className={styles.h2hCard}>
          <div className={styles.h2hBalance}>
            {players.map((player, index) => {
              const country = playerBiography(player.name,q.tour==='wta'?'wta':'atp')?.country;
              const leading = directWins[index] > directWins[1 - index];
              return <div className={styles.h2hPlayer} data-leading={leading ? 'true' : undefined} data-side={index === 0 ? 'left' : 'right'} data-has-country={country?'true':'false'} data-wins={directWins[index]} key={player.name}>
                <span className={styles.h2hFlag}><PlayerFlag code={country}/></span>
                <strong>{player.name}</strong>
                <small>{number(directWins[index])} {directWins[index] === 1 ? 'victoria' : 'victorias'}</small>
              </div>;
            })}
            <div className={styles.h2hScore}><span>Balance</span><strong data-right-leading={directWins[1] > directWins[0] ? 'true' : undefined}><em>{number(directWins[0])}</em><i>—</i><b>{number(directWins[1])}</b></strong></div>
          </div>
          {leadTimeline.length>1?<section className={styles.h2hTimeline} aria-labelledby="h2h-timeline-title">
            <div className={styles.h2hTimelineHeading}>
              <h3 id="h2h-timeline-title">Evolución del balance</h3>
              {leadChange?<Link href={toMatchRecord(leadChange.match).href}>El liderato cambió en {leadChange.match.tournament} {leadChange.match.year}</Link>:<span>Sin cambios de líder registrados</span>}
            </div>
            <ol aria-label={`Balance acumulado de ${chosen[0]} y ${chosen[1]}, del partido más antiguo al más reciente`}>
              {leadTimeline.map(point=>{
                const record=toMatchRecord(point.match);
                return <li data-leading={point.leader===null?'tie':point.leader===0?'first':'second'} data-lead-change={point.leaderChanged?'true':undefined} key={point.match.match_id}>
                  <Link href={record.href} aria-label={`${point.match.tournament} ${point.match.year}: balance ${point.wins[0]} a ${point.wins[1]}${point.leaderChanged?', cambio de líder':''}`}>
                    <span>{point.match.year}</span><strong>{point.wins[0]}–{point.wins[1]}</strong><small>{point.match.tournament}</small>{point.leaderChanged?<em>Cambio de líder</em>:null}
                  </Link>
                </li>;
              })}
            </ol>
          </section>:null}
          {directMatches.length ? <div className={styles.h2hHistory}>
            {directMatches.slice(0,3).map(match => <ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext />)}
            {q.h2h==='all'&&directMatches.slice(3).map(match=><ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext />)}
            {directMatches.length>3&&q.h2h!=='all'?<div className={styles.h2hMore}><Link href={`${compareHref({h2h:'all'})}#cara-a-cara`}>Ver todos los partidos</Link></div>:null}
          </div> : <p className="dx-notice">No hay enfrentamientos terminados con esta selección.</p>}
        </div>
      </section>
    </>}
    {valid && !same && <aside className={styles.methodNote} aria-label="Criterio de la comparación">
      <strong>Criterio del archivo</strong>
      <span>Ranking documentado: {players.map(player=>`${player.name} ${number(player.ranking)}/${number(player.played)}`).join(" · ")}. Top 10 usa esa cobertura; solo cuentan partidos finalizados.</span>
      {q.age && q.age !== 'all' ? <span>Edad documentada: {players.map(player => `${player.name} ${number(player.ageCoverage)}/${number(player.base)}`).join(' · ')}.</span> : null}
    </aside>}
  </div>;
}
