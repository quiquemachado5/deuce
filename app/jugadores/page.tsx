import { ArrowUpRight, Search } from 'lucide-react';
import Link from 'next/link';
import { playerSlug, rivalryDirectory } from '@/lib/explore';
import { preparedGeneration } from '@/lib/revista/read-records';
import { number, description } from '@/lib/cuaderno/model';
import FilterForm from '@/components/revista/FilterForm';
import { Pagination } from '@/components/nocturno/Row';
import { normalizeText } from '@/lib/quality';
import { playerPhoto } from '@/lib/player-imagery';
import PairPicker from '@/components/analytics/PairPicker';
import { ArchivePage, ArchiveGrid } from '@/components/deuce/ArchivePage';
export const metadata = {
  title: "Jugadores y cara a cara — DEUCE",
  description,
  alternates: { canonical: "/jugadores" },
};

export default async function Players({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; sort?: string }>;
}) {
  const query = await searchParams;
  const pairs = query.tipo === "enfrentamientos" || query.tipo === "parejas";
  const generation = await preparedGeneration();
  const [recordSource, pairSource] = await Promise.all([
    pairs ? Promise.resolve([]) : generation.records(),
    pairs ? generation.matches() : Promise.resolve([]),
  ]);
  const term = normalizeText(query.q || "");
  const sort = query.sort === "played" || query.sort === "wins" || query.sort === "finals" ? query.sort : "slams";
  const records = new Map(recordSource.map((record) => [record.name, record]));
  const players = recordSource.map((record) => ({ name: record.name, won: record.wins, played: record.played }))
    .filter((player) => normalizeText(player.name).includes(term))
    .sort((a, b) => {
      const primary = sort === "played" ? b.played - a.played
        : sort === "finals" ? (records.get(b.name)?.finalsWon || 0) - (records.get(a.name)?.finalsWon || 0)
        : sort === "wins" ? b.won - a.won
        : (records.get(b.name)?.grandSlamFinalsWon || 0) - (records.get(a.name)?.grandSlamFinalsWon || 0);
      return primary || b.won - a.won || a.name.localeCompare(b.name, "es");
    });
  const duels = pairs ? rivalryDirectory(pairSource).filter((pair) => normalizeText(pair.names.join(" ")).includes(term)) : [];
  const total = pairs ? duels.length : players.length;
  const page = Math.max(1, Math.min(Math.ceil(total / 25) || 1, Number(query.page) || 1));
  const url = (params: Record<string, string>) => {
    const next = new URLSearchParams();
    Object.entries({ ...query, ...params }).forEach(([key, value]) => {
      if (value && value !== "all" && !(key === "page" && value === "1")) next.set(key, value);
    });
    const search = next.toString();
    return `/jugadores${search ? `?${search}` : ""}`;
  };

  const cards = pairs ? duels.slice((page-1)*25,page*25).map(pair => {
    const leaderIndex = pair.wins[0] === pair.wins[1] ? -1 : pair.wins[0] > pair.wins[1] ? 0 : 1;
    const context = leaderIndex === -1 ? 'Empate' : `${pair.wins.join('–')} para ${leaderIndex === 0 ? pair.names[0] : pair.names[1]}`;
    return { id:pair.slug, title:pair.names.join(' · '), value:pair.wins.join('–'), meta:`${context} · ${number(pair.matches.length)} partidos terminados del archivo`, href:`/rivalries/${pair.slug}` };
  }) : players.slice((page-1)*25,page*25).map(player => {
    const photo=playerPhoto(player.name);
    const record=records.get(player.name);
    return { id:player.name,title:player.name,image:photo?.src,alt:photo?.alt,imagePosition:photo?.objectPosition||'center top',fallback:player.name.split(/\s+/).map(part=>part[0]).slice(0,2).join(''),
      eyebrow:`${number(record?.grandSlamFinalsWon || 0)} Grand Slam · ${number(player.won)} victorias`,
      meta:`${number(player.played ? 100*player.won/player.played : 0,1)} % de victorias · ${number(player.played)} partidos`,
      href:`/jugadores/${playerSlug(player.name)}`,actionLabel:'Ver perfil' };
  });
  const tools=<div className="archive-filter-shell player-toolbar archive-unified-toolbar">
    <nav className="deuce-tabs" aria-label="Explorar jugadores"><Link href="/jugadores" aria-current={!pairs?'page':undefined}>Jugadores</Link><Link href="/jugadores?tipo=enfrentamientos" aria-current={pairs?'page':undefined}>Enfrentamientos</Link></nav>
    <FilterForm action="/jugadores">
      <input type="hidden" name="tipo" value={pairs?'enfrentamientos':'jugadores'}/>
      <label className="nc-field nc-filter-query"><span>Buscar {pairs?'un enfrentamiento':'jugadores'}</span><Search className="player-query-icon" size={17} aria-hidden="true"/><input name="q" type="search" defaultValue={query.q} placeholder={pairs?'Jugador o rival':'Buscar jugador'} autoComplete="off"/></label>
      {!pairs&&<label className="player-sort"><span>Ordenar por</span><select name="sort" defaultValue={sort} aria-label="Ordenar jugadores"><option value="slams">Grand Slams</option><option value="wins">Victorias</option><option value="played">Partidos</option><option value="finals">Finales ganadas</option></select></label>}
    </FilterForm>
  </div>;
  return <ArchivePage title="Jugadores" className="player-directory" tools={tools}>
    <div className="deuce-content">
      {pairs&&<details className="deuce-disclosure"><summary>Elegir dos jugadores</summary><PairPicker/></details>}
      {pairs&&<p className="deuce-count" role="status">{number(total)} enfrentamientos · Solo partidos terminados del archivo</p>}
      {term&&<Link className="deuce-text-link" href={pairs?'/jugadores?tipo=enfrentamientos':'/jugadores'}>Limpiar filtros <ArrowUpRight size={17} aria-hidden="true"/></Link>}
    </div>
    <ArchiveGrid cards={cards}/>
    {!total&&<div className="deuce-empty deuce-content"><h2>No hay resultados</h2><p>No encontramos jugadores con esta búsqueda.</p><Link href={pairs?'/jugadores?tipo=enfrentamientos':'/jugadores'}>Quitar filtros</Link></div>}
    <Pagination page={page} total={total} href={next=>url({page:String(next)})}/>
  </ArchivePage>;
}
