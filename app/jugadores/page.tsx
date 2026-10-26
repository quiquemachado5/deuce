import { ArrowUpRight } from 'lucide-react';
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
  searchParams: Promise<{ q?: string; page?: string; tipo?: string; sort?: string; letter?: string }>;
}) {
  const query = await searchParams;
  const pairs = query.tipo === "parejas";
  const generation = await preparedGeneration();
  const [recordSource, pairSource] = await Promise.all([
    pairs ? Promise.resolve([]) : generation.records(),
    pairs ? generation.matches() : Promise.resolve([]),
  ]);
  const term = normalizeText(query.q || "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const requestedLetter = (query.letter || "").toUpperCase();
  const letter = alphabet.includes(requestedLetter) ? requestedLetter : "";
  const sort = query.sort === "played" || query.sort === "finals" ? query.sort : "wins";
  const records = new Map(recordSource.map((record) => [record.name, record]));
  const availableLetters = new Set(recordSource.map((record) => normalizeText(record.name).charAt(0).toUpperCase()));
  const players = recordSource.map((record) => ({ name: record.name, won: record.wins, played: record.played }))
    .filter((player) => normalizeText(player.name).includes(term))
    .filter((player) => !letter || normalizeText(player.name).charAt(0).toUpperCase() === letter)
    .sort((a, b) => {
      const primary = sort === "played" ? b.played - a.played
        : sort === "finals" ? (records.get(b.name)?.finalsWon || 0) - (records.get(a.name)?.finalsWon || 0)
        : b.won - a.won;
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

  const cards = pairs ? duels.slice((page-1)*25,page*25).map(pair => ({
    id:pair.slug, title:pair.names.join(' · '), value:pair.wins.join('–'), meta:`${number(pair.matches.length)} partidos`, href:`/rivalries/${pair.slug}`
  })) : players.slice((page-1)*25,page*25).map(player => {
    const photo=playerPhoto(player.name);
    return { id:player.name,title:player.name,image:photo?.src,alt:photo?.alt,imagePosition:'center top',
      eyebrow:`${number(player.won)} victorias · ${number(player.played)} partidos`,
      meta:`${number(player.played ? 100*player.won/player.played : 0,1)} % de victorias · ${number(records.get(player.name)?.finalsWon || 0)} finales ganadas`,
      href:`/jugadores/${playerSlug(player.name)}` };
  });
  return <ArchivePage title="Jugadores" className="player-directory">
    <div className="deuce-content">
      <div className="archive-filter-shell player-toolbar">
        <nav className="deuce-tabs" aria-label="Explorar jugadores"><Link href="/jugadores" aria-current={!pairs?'page':undefined}>Jugadores</Link><Link href="/jugadores?tipo=parejas" aria-current={pairs?'page':undefined}>Cara a cara</Link></nav>
        <FilterForm action="/jugadores">
          <input type="hidden" name="tipo" value={pairs?'parejas':'jugadores'}/>
          {letter&&<input type="hidden" name="letter" value={letter}/>}
          <label className="nc-field nc-filter-query"><span>Buscar {pairs?'un enfrentamiento':'jugadores'}</span><input name="q" type="search" defaultValue={query.q} placeholder={pairs?'Jugador o rival':'Nombre del jugador'} autoComplete="off"/></label>
          {!pairs&&<label className="player-sort"><span>Ordenar por</span><select name="sort" defaultValue={sort} aria-label="Ordenar jugadores"><option value="wins">Victorias</option><option value="played">Partidos</option><option value="finals">Finales ganadas</option></select></label>}
        </FilterForm>
        {!pairs&&<div className="player-index-row"><nav className="deuce-alphabet" aria-label="Índice alfabético"><Link href={url({letter:'',page:'1'})} aria-current={!letter?'page':undefined}>Todos</Link>{alphabet.map(initial=>availableLetters.has(initial)?<Link key={initial} href={url({letter:initial,page:'1'})} aria-current={letter===initial?'page':undefined}>{initial}</Link>:<span key={initial} aria-disabled="true">{initial}</span>)}</nav><p className="deuce-count" role="status">{number(total)} jugadores</p></div>}
      </div>
      {pairs&&<details className="deuce-disclosure"><summary>Elegir dos jugadores</summary><PairPicker/></details>}
      {pairs&&<p className="deuce-count" role="status">{number(total)} parejas · Resultados del archivo</p>}
      {(term||letter)&&<Link className="deuce-text-link" href={pairs?'/jugadores?tipo=parejas':'/jugadores'}>Limpiar filtros <ArrowUpRight size={17} aria-hidden="true"/></Link>}
    </div>
    <ArchiveGrid cards={cards}/>
    {!total&&<div className="deuce-empty deuce-content"><h2>No hay resultados</h2><p>No encontramos jugadores con esta búsqueda y esta inicial.</p><Link href={pairs?'/jugadores?tipo=parejas':'/jugadores'}>Quitar filtros</Link></div>}
    <Pagination page={page} total={total} href={next=>url({page:String(next)})}/>
  </ArchivePage>;
}
