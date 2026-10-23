import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { archiveIndex } from '@/lib/archive-index';
import { comparePlayer } from '@/lib/player-comparison';
import { playerPhoto } from '@/lib/player-imagery';
import { playerSlug } from '@/lib/explore';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { number, round } from '@/lib/cuaderno/model';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import PlayerInput from '@/components/PlayerInput';
import CompareSelection from './CompareSelection';
import PlayerAvatar from '@/components/PlayerAvatar';
import { tournamentName } from '@/lib/labels';
import SetScoreboard from '@/components/SetScoreboard';

export const metadata = { title: 'Comparador de jugadores — DEUCE', alternates: { canonical: '/comparar' }, robots: { index: false, follow: true } };
type Query = Record<string, string | undefined>;

export default async function Compare({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams, generation = await preparedGeneration(), matches = await generation.matches();
  const names = [...archiveIndex(matches).players.keys()].sort((a,b) => a.localeCompare(b,'es'));
  const chosen = [q.a || 'Novak Djokovic', q.b || 'Rafael Nadal'];
  const players = chosen.map(name => comparePlayer(matches, name, q));
  const same = chosen[0] === chosen[1], valid = chosen.every(name => names.includes(name));
  const sufficient = !same && valid && players.every(p => p.sufficient);
  const minimum = ['5','20','50'].includes(q.minimum || '') ? q.minimum! : '20';
  const context = [
    q.year && q.year !== 'all' ? `Temporada ${q.year}` : 'Todas las temporadas',
    q.surface && q.surface !== 'all' ? surfaceLabel[q.surface as keyof typeof surfaceLabel] : 'Todas las superficies',
    q.competition && q.competition !== 'all' ? q.competition : 'Todas las competiciones',
    q.age && q.age !== 'all' ? `${q.age} años al jugar` : 'Todas las edades',
    `Mínimo ${minimum} partidos`,
  ];
  const metrics = [
    { label: 'Victorias', values: players.map(player => player.won), percent: false, lowerIsBetter: false },
    { label: 'Derrotas', values: players.map(player => player.lost), percent: false, lowerIsBetter: true },
    { label: 'Efectividad', values: players.map(player => player.rate), percent: true, lowerIsBetter: false },
    { label: 'Títulos del archivo', values: players.map(player => player.titles), percent: false, lowerIsBetter: false },
    { label: 'Finales jugadas', values: players.map(player => player.finals), percent: false, lowerIsBetter: false },
    { label: 'Victorias ante top 10', values: players.map(player => player.top10Won), percent: false, lowerIsBetter: false },
  ];
  const sampleHref = (name: string) => {
    const params = new URLSearchParams({ player: name });
    if (q.year && q.year !== 'all') params.set('year', q.year);
    if (q.surface && q.surface !== 'all') params.set('surface', q.surface);
    if (q.competition && q.competition !== 'all') params.set('category', q.competition);
    return `/buscar?${params}`;
  };

  return <div className="nc-wrap dx-comparison">
    <ArchiveNotice status={generation} />
    <header className="dx-page-heading"><h1>Comparar jugadores</h1><p>Dos trayectorias dentro del mismo marco del archivo.</p></header>
    <CompareSelection key={chosen.join('|')} initial={chosen.map(name => {
      const photo = playerPhoto(name);
      return { name, photo: photo ? { src: photo.avatarCrop ? photo.src : photo.thumbnail || photo.src, objectPosition: photo.objectPosition, avatarCrop: photo.avatarCrop } : undefined };
    })}>
      {['a','b'].map((key,index) => <label className="nc-field" key={key}><span>Jugador {index + 1}</span><PlayerInput key={chosen[index]} name={key} initial={chosen[index]} /></label>)}
      <label className="nc-field"><span>Temporada</span><select name="year" defaultValue={q.year || 'all'}><option value="all">Todas</option>{generation.manifest.years.map(year => <option key={year}>{year}</option>)}</select></label>
      <label className="nc-field"><span>Superficie</span><select name="surface" defaultValue={q.surface || 'all'}><option value="all">Todas</option>{SURFACES.map(s => <option value={s} key={s}>{surfaceLabel[s]}</option>)}</select></label>
      <label className="nc-field"><span>Competición</span><select name="competition" defaultValue={q.competition || 'all'}><option value="all">Todas</option>{[...new Set(matches.map(m => m.category))].sort().filter(category => category !== 'ATP Tour · nivel no especificado').map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="nc-field"><span>Edad al jugar</span><select name="age" defaultValue={q.age || 'all'}><option value="all">Todas las edades</option>{Array.from({length:40},(_,i) => i + 14).map(age => <option key={age} value={age}>{age} años</option>)}</select></label>
      <label className="nc-field"><span>Muestra mínima</span><select name="minimum" defaultValue={minimum}>{[5,20,50].map(n => <option key={n} value={n}>{n} partidos</option>)}</select></label>
      <button className="dx-button" type="submit">Actualizar comparación</button>
    </CompareSelection>
    <p className="dx-comparison-context">{context.join(' · ')}</p>
    {!valid ? <p role="status" className="dx-notice">Selecciona dos nombres del archivo. No hay resultados para {chosen.filter(n => !names.includes(n)).join(', ')}.</p> : <>
      {(same || !sufficient) && <p role="status" className="dx-notice">{same ? 'Has elegido el mismo jugador. Selecciona dos jugadores distintos.' : 'La muestra no alcanza el mínimo elegido; las cifras se muestran sin declarar una ventaja.'}</p>}
      <section className="dx-comparison-table" aria-labelledby="comparison-table-title">
        <div className="dx-comparison-players"><h2 id="comparison-table-title" className="nc-sr">Comparación métrica</h2>{players.map(player => <Link href={`/players/${playerSlug(player.name)}`} key={player.name}><PlayerAvatar name={player.name} size={64}/><strong>{player.name}</strong><span>{number(player.played)} partidos</span></Link>)}</div>
        <div className="dx-shared-metrics" role="table" aria-label={`Comparación entre ${chosen[0]} y ${chosen[1]}`}>
          <div className="dx-shared-metric-head" role="row"><span role="columnheader">Métrica</span><span role="columnheader">{chosen[0]}</span><span role="columnheader">{chosen[1]}</span><span role="columnheader">Diferencia</span></div>
          {metrics.map(metric => {
            const [a,b] = metric.values;
            const difference = typeof a === 'number' && typeof b === 'number' ? Math.abs(a-b) : null;
            const leader = difference && a !== b ? ((a! > b!) !== metric.lowerIsBetter ? chosen[0] : chosen[1]) : '';
            const format = (value: number | null) => value === null ? '—' : `${number(value, metric.percent ? 1 : undefined)}${metric.percent ? ' %' : ''}`;
            return <div className="dx-shared-metric-row" role="row" key={metric.label}><strong role="rowheader">{metric.label}</strong><span role="cell">{format(a)}</span><span role="cell">{format(b)}</span><small role="cell">{difference === null || difference === 0 ? 'Igual' : `${metric.percent ? `${number(difference,1)} pp` : number(difference)} · ${leader}`}</small></div>;
          })}
        </div>
      </section>
      <section className="dx-surface-comparison" aria-labelledby="surface-comparison-title">
        <div className="dx-section-heading"><h2 id="surface-comparison-title">Rendimiento por superficie</h2><span>Porcentaje de victorias en la muestra</span></div>
        <div className="dx-surface-comparison-list">
          {SURFACES.map((surface) => <article key={surface}>
            <h3>{surfaceLabel[surface]}</h3>
            {players.map((player) => {
              const result = player.surfaces.find((entry) => entry.surface === surface)!;
              return <div className="dx-surface-player" key={player.name}>
                <span><strong>{player.name}</strong><small>{result.played ? `${number(result.won)}–${number(result.played - result.won)} · ${number(result.rate!, 1)} %` : "Sin partidos"}</small></span>
                <span className="dx-surface-track" aria-hidden="true"><i style={{ width: `${result.rate || 0}%` }} /></span>
              </div>;
            })}
          </article>)}
        </div>
        <div className="dx-finals-comparison" aria-label="Rendimiento en finales">
          <h3>Finales</h3>
          {players.map((player) => <p key={player.name}><span>{player.name}</span><strong>{player.finals ? `${number(player.titles)} de ${number(player.finals)} · ${number(player.titles / player.finals * 100, 1)} %` : "Sin finales"}</strong></p>)}
        </div>
      </section>
      <section className="dx-dual-sample" aria-labelledby="sample-title"><div className="dx-section-heading"><h2 id="sample-title">Partidos de la muestra</h2><span>Últimos cinco de cada jugador</span></div><div className="dx-dual-sample-grid">{players.map(player => <div className="dx-sample-column" key={player.name}><h3>{player.name}</h3>{[...player.matches].slice(-5).reverse().map(match => <article className="dx-sample-match" key={match.match_id}><Link className="dx-sample-match-context" href={`/match/${match.match_id}`}>{tournamentName(match.tournament)} · {match.year} · {round(match)} <span aria-hidden="true">↗</span></Link><SetScoreboard match={match} compact /></article>)}<Link className="dx-sample-all" href={sampleHref(player.name)}>Ver toda la muestra</Link></div>)}</div></section>
    </>}
    <p className="dx-provenance">Solo se comparan resultados completos. Los abandonos y encuentros en revisión quedan fuera de las cifras.</p>
  </div>;
}
