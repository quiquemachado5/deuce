import Image from 'next/image';
import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import { archiveIndex } from '@/lib/archive-index';
import { comparePlayer } from '@/lib/player-comparison';
import { playerPhoto } from '@/lib/player-imagery';
import { playerSlug } from '@/lib/explore';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { number } from '@/lib/cuaderno/model';
import Row, { Pagination } from '@/components/nocturno/Row';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import PlayerInput from '@/components/PlayerInput';
import PlayerFlag from '@/components/PlayerFlag';
import { playerBiography, countryLabel } from '@/lib/player-bio';
import CompareSelection from './CompareSelection';
import { avatarPhotoStyle } from '@/lib/photo-style';

export const metadata = { title: 'Comparador de jugadores — DEUCE', alternates: { canonical: '/comparar' }, robots: { index: false, follow: true } };
type Query = Record<string, string | undefined>;
const href = (q: Query) => '/comparar?' + new URLSearchParams(Object.entries(q).filter(([,v]) => v) as [string,string][]);
export default async function Compare({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams, generation = await preparedGeneration(), matches = await generation.matches();
  const names = [...archiveIndex(matches).players.keys()].sort((a,b) => a.localeCompare(b,'es'));
  const chosen = [q.a || 'Novak Djokovic', q.b || 'Rafael Nadal'];
  const players = chosen.map(name => comparePlayer(matches, name, q));
  const same = chosen[0] === chosen[1], valid = chosen.every(name => names.includes(name));
  const evidencePlayer = q.evidencia === 'b' ? 1 : 0, evidence = players[evidencePlayer];
  const page = Math.min(Math.max(1, Math.floor(Number(q.page)) || 1), Math.max(1, Math.ceil(evidence.played / 25)));
  const sufficient = !same && valid && players.every(p => p.sufficient);
  return <div className="nc-wrap dx-comparison">
    <ArchiveNotice status={generation} />
    <header className="dx-page-heading"><h1>Compara con contexto.</h1><p>Una temporada, una superficie o una edad. Tú eliges el marco; el archivo muestra sus límites.</p></header>
    <CompareSelection key={chosen.join('|')} initial={chosen.map(name => {
      const photo = playerPhoto(name);
      return { name, country: playerBiography(name)?.country, photo: photo ? { src: photo.src, objectPosition: photo.objectPosition, avatarCrop: photo.avatarCrop } : undefined };
    })}>
      {['a','b'].map((key,index) => <label className="nc-field" key={key}><span>Jugador {index + 1}</span><PlayerInput key={chosen[index]} name={key} initial={chosen[index]} /></label>)}
      <label className="nc-field"><span>Temporada</span><select name="year" defaultValue={q.year || 'all'}><option value="all">Todas</option>{generation.manifest.years.map(year => <option key={year}>{year}</option>)}</select></label>
      <label className="nc-field"><span>Superficie</span><select name="surface" defaultValue={q.surface || 'all'}><option value="all">Todas</option>{SURFACES.map(s => <option value={s} key={s}>{surfaceLabel[s]}</option>)}</select></label>
      <label className="nc-field"><span>Competición</span><select name="competition" defaultValue={q.competition || 'all'}><option value="all">Todas</option>{[...new Set(matches.map(m => m.category))].sort().map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="nc-field"><span>Edad al jugar</span><select name="age" defaultValue={q.age || 'all'}><option value="all">Todas las edades</option>{Array.from({length:40},(_,i) => i + 14).map(age => <option key={age} value={age}>{age} años</option>)}</select></label>
      <label className="nc-field"><span>Muestra mínima</span><select name="minimum" defaultValue={q.minimum || '20'}>{[5,20,50].map(n => <option key={n} value={n}>{n} partidos</option>)}</select></label>
      <button className="dx-button" type="submit">Comparar jugadores</button>
    </CompareSelection>
    {!valid ? <p role="status" className="dx-notice">Selecciona dos nombres del archivo. No hay resultados para {chosen.filter(n => !names.includes(n)).join(', ')}.</p> : <>
    {(same || !sufficient) && <p role="status" className="dx-notice">{same ? 'Has elegido el mismo jugador. Selecciona dos jugadores distintos.' : 'Muestra pequeña o sin datos: se muestran las cifras, pero no se destaca una ventaja comparativa.'}</p>}
    <div className="dx-compare-cards">{players.map((p,i) => {const photo = playerPhoto(p.name), bio = playerBiography(p.name);return <article className="dx-player-card" key={i}>
      <div className="dx-player-card-top"><div><h2><Link href={`/players/${playerSlug(p.name)}`}>{p.name}</Link></h2>{bio?.country && <p className="pd-compare-country"><PlayerFlag code={bio.country} />{countryLabel(bio.country)}</p>}</div>{photo && <span className="pd-compare-card-avatar"><Image src={photo.src} width={208} height={208} alt="" style={avatarPhotoStyle(photo)} unoptimized /></span>}</div>
      <p className="dx-player-rate">{p.rate === null ? '—' : number(p.rate,1)}{p.rate !== null && <span>%</span>}</p><p className="dx-muted">Victorias · {number(p.won)} de {number(p.played)} partidos</p>
      <div className="dx-rate-track" aria-hidden="true"><i style={{width:`${p.rate || 0}%`}} /></div>
      <dl className="dx-metric-grid"><div><dt>Victorias</dt><dd>{number(p.won)}</dd></div><div><dt>Derrotas</dt><dd>{number(p.lost)}</dd></div><div><dt>Títulos del archivo</dt><dd>{number(p.titles)}</dd></div><div><dt>Finales jugadas</dt><dd>{number(p.finals)}</dd></div></dl>
      <p className="dx-muted">Ante top 10: {p.ranking ? `${p.top10Won} victorias / ${p.top10Played} partidos` : 'sin ranking histórico disponible'}. Ranking del rival conocido en {number(p.ranking)} de {number(p.played)} encuentros.</p>
      {q.age && q.age !== 'all' && <p className="dx-muted">Edad publicada en {number(p.ageCoverage)} de {number(p.base)} partidos previos al filtro de edad. No se estima una edad ausente.</p>}
      <Link className="dx-inline-link" href={href({...q,a:chosen[0],b:chosen[1],evidencia:i ? 'b':'a',page:'1'}) + '#partidos'}>Ver los {number(p.played)} partidos</Link>
    </article>;})}</div>
    <aside className="dx-notice">{sufficient && players.every(p => p.rate !== null) ? `Diferencia: ${number(Math.abs(players[0].rate! - players[1].rate!),1)} puntos porcentuales de victorias. ` : ''}Mismos filtros no significan rivales, calendario ni cobertura equivalentes. No es una clasificación de quién es mejor ni de toda su carrera. <Link href="/cobertura">Consultar cobertura</Link>.</aside>
    <section id="partidos" className="dx-evidence-list"><div className="dx-section-heading"><div><h2>La muestra de {evidence.name}</h2></div><span>{number(evidence.played)} partidos</span></div>
      {evidence.matches.slice((page-1)*25,page*25).map(m => <Row key={m.match_id} match={m} />)}
      {!evidence.played && <p>No hay partidos que cumplan esta selección. No equivale a cero victorias en su carrera.</p>}
      {evidence.played > 25 && <Pagination page={page} total={evidence.played} href={p => href({...q,a:chosen[0],b:chosen[1],page:String(p)}) + '#partidos'} />}
    </section></>}
    <p className="dx-provenance">Versión {generation.manifest.version} · Reglas {generation.manifest.rulesVersion} · Solo resultados completos; se excluyen abandonos y encuentros en revisión.</p>
  </div>;
}
