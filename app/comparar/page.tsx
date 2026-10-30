import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { comparePlayer, sharedCareerWindow } from '@/lib/player-comparison';
import { playerPhoto } from '@/lib/player-imagery';
import { playerSlug } from '@/lib/explore';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { number } from '@/lib/cuaderno/model';
import { eligibleMatch, normalizeText } from '@/lib/quality';
import { chronological, winnerName } from '@/lib/editorial';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import PlayerInput from '@/components/PlayerInput';
import CompareSelection, { CompareSampleFilters } from './CompareSelection';
import PlayerFlag from '@/components/PlayerFlag';
import { playerBiography } from '@/lib/player-bio';
import { ArchiveMatchRow } from '@/components/deuce/MatchArchivePage';
import { toMatchRecord } from '@/data/map-match';
import styles from './compare.module.css';

export const metadata = { title: 'Comparador de jugadores — DEUCE', alternates: { canonical: '/comparar' }, robots: { index: false, follow: true } };
export const revalidate = 300;
type Query = Record<string, string | undefined>;

export default async function Compare({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams, generation = await preparedGeneration();
  const [matches,recordSource]=await Promise.all([generation.matches(),generation.records()]);
  const names = recordSource.map(player=>player.name).sort((a,b) => a.localeCompare(b,'es'));
  const resolvePlayer = (value: string) => {
    const exact = names.find(name => playerSlug(name) === playerSlug(value) || normalizeText(name) === normalizeText(value));
    if (exact) return exact;
    const token = normalizeText(value).replace(/-/g, ' ').trim();
    const surnames = names.filter(name => normalizeText(name).split(/\s+/).at(-1) === token);
    return surnames.length === 1 ? surnames[0] : '';
  };
  const requested = [q.a || 'Novak Djokovic', q.b || 'Rafael Nadal'];
  const resolved = requested.map(resolvePlayer);
  const chosen = requested.map((name, index) => resolved[index] || name);
  const chosenNames=new Set(chosen);
  const relevantMatches=matches.filter(match=>chosenNames.has(match.player1.name)||chosenNames.has(match.player2.name));
  const window = sharedCareerWindow(relevantMatches, chosen);
  const cohort = q.period === 'shared' ? (window ? relevantMatches.filter(m=>m.year>=window.first&&m.year<=window.last) : []) : relevantMatches;
  const players = chosen.map(name => comparePlayer(cohort, name, q));
  const same = chosen[0] === chosen[1], valid = resolved.every(Boolean);
  const sufficient = !same && valid && players.every(p => p.sufficient);
  const minimum = ['5','20','50'].includes(q.minimum || '') ? q.minimum! : '20';
  const activeSampleFilters = [q.period && q.period !== 'career', q.year && q.year !== 'all', q.surface && q.surface !== 'all', q.competition && q.competition !== 'all', q.age && q.age !== 'all', q.minimum && q.minimum !== '20'].filter(Boolean).length;
  const metrics = [
    { label: 'Victorias', values: players.map(player => player.won), percent: false, lowerIsBetter: false },
    { label: 'Derrotas', values: players.map(player => player.lost), percent: false, lowerIsBetter: true },
    { label: 'Efectividad', values: players.map(player => player.rate), percent: true, lowerIsBetter: false },
    { label: 'Títulos del archivo', values: players.map(player => player.titles), percent: false, lowerIsBetter: false },
    { label: 'Finales jugadas', values: players.map(player => player.finals), percent: false, lowerIsBetter: false },
    { label: 'Victorias ante top 10', values: players.map(player => player.top10Won), percent: false, lowerIsBetter: false },
  ];
  const metricGroups = [
    { title: 'Trayectoria', rows: metrics.slice(0, 3) },
    { title: 'Rendimiento', rows: metrics.slice(3) },
  ];
  const directMatches = matches.filter(match => chosen.includes(match.player1.name) && chosen.includes(match.player2.name))
    .filter(eligibleMatch)
    .filter(match => (!q.year || q.year === 'all' || match.year === Number(q.year)) && (!q.surface || q.surface === 'all' || match.surface === q.surface) && (!q.competition || q.competition === 'all' || match.category === q.competition))
    .filter(match => q.period !== 'shared' || !window || (match.year >= window.first && match.year <= window.last))
    .sort((a,b) => chronological(b,a));
  const directWins = chosen.map(name => directMatches.filter(match => winnerName(match) === name).length);
  const compareHref = (changes: Query) => {
    const params = new URLSearchParams();
    Object.entries({ ...q, a: chosen[0], b: chosen[1], ...changes }).forEach(([key,value]) => { if (value && value !== 'all') params.set(key,value); });
    return `/comparar?${params}`;
  };
  const surfacesToShow = q.surface && q.surface !== 'all' ? SURFACES.filter(surface => surface === q.surface) : SURFACES.filter(surface => surface !== 'unknown');

  return <div className={`${styles.page} nc-wrap dx-comparison deuce-comparison`}>
    <ArchiveNotice status={generation} />
    <header className={`inner-title ${styles.intro}`}><h1>Comparar</h1></header>
    <CompareSelection key={chosen.join('|')} initial={chosen.map(name => {
      const photo = playerPhoto(name);
      const hasThumbnail = Boolean(photo?.thumbnail);
      return { name, country: playerBiography(name)?.country, photo: photo ? {
        src: photo.thumbnail || photo.src,
        objectPosition: hasThumbnail ? '50% 20%' : photo.objectPosition,
        avatarCrop: hasThumbnail ? undefined : photo.avatarCrop,
      } : undefined };
    })}>
      {['a','b'].map((key,index) => <div className="nc-field" key={key}><span>Jugador {index + 1}</span><PlayerInput key={chosen[index]} name={key} initial={chosen[index]} options={names} label={`Jugador ${index + 1}`} /></div>)}
      <CompareSampleFilters summary={activeSampleFilters ? `${activeSampleFilters} activos` : 'Valores generales'}>
        <label className="nc-field"><span>Periodo de comparación</span><select name="period" defaultValue={q.period || "career"}><option value="career">Carrera documentada</option><option value="shared">Periodo compartido</option></select></label>
        <label className="nc-field"><span>Temporada</span><select name="year" defaultValue={q.year || 'all'}><option value="all">Todas</option>{generation.manifest.years.map(year => <option key={year}>{year}</option>)}</select></label>
        <label className="nc-field"><span>Superficie</span><select name="surface" defaultValue={q.surface || 'all'}><option value="all">Todas</option>{SURFACES.map(s => <option value={s} key={s}>{surfaceLabel[s]}</option>)}</select></label>
        <label className="nc-field"><span>Competición</span><select name="competition" defaultValue={q.competition || 'all'}><option value="all">Todas</option>{[...new Set(matches.map(m => m.category))].sort().filter(category => category !== 'ATP Tour · nivel no especificado').map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="nc-field"><span>Edad al jugar</span><select name="age" defaultValue={q.age || 'all'}><option value="all">Todas las edades</option>{[['14-17','14–17'],['18-21','18–21'],['22-25','22–25'],['26-29','26–29'],['30-34','30–34'],['35+','35 o más']].map(([value,label]) => <option key={value} value={value}>{label} años</option>)}</select></label>
        <label className="nc-field"><span>Muestra mínima</span><select name="minimum" defaultValue={minimum}>{[5,20,50].map(n => <option key={n} value={n}>{n} partidos</option>)}</select></label>
      </CompareSampleFilters>
      <button className="dx-button" type="submit">Comparar</button>
    </CompareSelection>
    {!valid ? <p role="status" className="dx-notice">Selecciona dos nombres del archivo. No hay resultados para {chosen.filter(n => !names.includes(n)).join(', ')}.</p> : <>
      {(same || !sufficient) && <p role="status" className="dx-notice">{same ? 'Has elegido el mismo jugador. Selecciona dos jugadores distintos.' : 'La muestra no alcanza el mínimo elegido; las cifras se muestran sin declarar una ventaja.'}</p>}
      <section className={styles.comparisonBoard} id="comparison" aria-labelledby="comparison-table-title">
        <h2 id="comparison-table-title" className="nc-sr">Comparación métrica</h2>
        <div className={styles.comparisonHeader}>
          {players.map((player, index) => {
            const country = playerBiography(player.name)?.country;
            return <Link className={styles.playerHeading} data-side={index === 0 ? 'left' : 'right'} href={`/jugadores/${playerSlug(player.name)}`} key={player.name}>
              <span className={styles.flag}>{country ? <PlayerFlag code={country}/> : null}</span>
              <strong>{player.name}</strong>
            </Link>;
          })}
          <span className={styles.comparisonLabel}>Comparativa</span>
        </div>
        <div className={styles.statGroups} aria-label={`Comparación entre ${chosen[0]} y ${chosen[1]}`}>
          {metricGroups.map(group => <article className={styles.statGroup} key={group.title}>
            <h3>{group.title}</h3>
            <div className={styles.statNames}><span>{chosen[0]}</span><span>{chosen[1]}</span></div>
            <dl>
              {group.rows.map(metric => {
                const [a,b] = metric.values;
                const leader = sufficient && typeof a === 'number' && typeof b === 'number' && a !== b ? ((a > b) !== metric.lowerIsBetter ? chosen[0] : chosen[1]) : '';
                const format = (value: number | null) => value === null ? '—' : `${number(value, metric.percent ? 1 : undefined)}${metric.percent ? ' %' : ''}`;
                return <div key={metric.label}>
                  <dd className={leader === chosen[0] ? styles.statWinner : undefined}>{format(a)}</dd>
                  <dt>{metric.label}</dt>
                  <dd className={leader === chosen[1] ? styles.statWinner : undefined}>{format(b)}</dd>
                </div>;
              })}
            </dl>
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
        <nav className={styles.scopeNav} aria-label="Comparar por competición">
          <span>Competición</span>
          {[
            ['all', 'Todas'],
            ['Grand Slam', 'Grand Slam'],
            ['Masters 1000', 'Masters 1000'],
            ['ATP 500', 'ATP 500'],
            ['ATP 250', 'ATP 250'],
          ].map(([value, label]) => <Link href={`${compareHref({competition:value})}#comparison`} scroll={false} aria-current={(q.competition || 'all') === value ? 'page' : undefined} key={value}>{label}</Link>)}
        </nav>
      </section>
      <section className={styles.headToHead} id="cara-a-cara" aria-labelledby="head-to-head-title">
        <div className={styles.h2hHeading}><h2 id="head-to-head-title">Cara a cara</h2><span>{number(directMatches.length)} {directMatches.length === 1 ? 'partido' : 'partidos'}</span></div>
        <div className={styles.h2hCard}>
          <div className={styles.h2hBalance}>
            {players.map((player, index) => {
              const country = playerBiography(player.name)?.country;
              const leading = directWins[index] > directWins[1 - index];
              return <div className={styles.h2hPlayer} data-leading={leading ? 'true' : undefined} data-side={index === 0 ? 'left' : 'right'} data-wins={directWins[index]} key={player.name}>
                <span className={styles.h2hFlag}>{country ? <PlayerFlag code={country}/> : null}</span>
                <strong>{player.name}</strong>
                <small>{number(directWins[index])} {directWins[index] === 1 ? 'victoria' : 'victorias'}</small>
              </div>;
            })}
            <div className={styles.h2hScore}><span>Balance</span><strong data-right-leading={directWins[1] > directWins[0] ? 'true' : undefined}><em>{number(directWins[0])}</em><i>—</i><b>{number(directWins[1])}</b></strong></div>
          </div>
          {directMatches.length ? <div className={styles.h2hHistory}>
            {directMatches.slice(0,3).map(match => <ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext />)}
            {directMatches.length>3?<details className={styles.h2hMore}>
              <summary>Ver todos los partidos</summary>
              <div>{directMatches.slice(3).map(match=><ArchiveMatchRow key={match.match_id} match={toMatchRecord(match)} showTournamentContext />)}</div>
            </details>:null}
          </div> : <p className="dx-notice">No hay enfrentamientos terminados con esta selección.</p>}
        </div>
      </section>
    </>}
    <aside className={styles.methodNote} aria-label="Criterio de la comparación">
      <strong>Criterio del archivo</strong>
      <span>Ranking documentado: {players.map(player=>`${player.name} ${number(player.ranking)}/${number(player.played)}`).join(" · ")}. Top 10 usa esa cobertura; solo cuentan partidos finalizados.</span>
      {q.age && q.age !== 'all' ? <span>Edad documentada: {players.map(player => `${player.name} ${number(player.ageCoverage)}/${number(player.base)}`).join(' · ')}.</span> : null}
    </aside>
  </div>;
}
