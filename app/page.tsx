import Image from "next/image";
import Link from "next/link";
import { preparedArchive, recordView } from "@/lib/revista/read-records";
import Row from "@/components/nocturno/Row";
import { playerPhoto } from "@/lib/player-imagery";
import { playerSlug } from "@/lib/explore";
import { chronological, roundPosition, winnerName } from "@/lib/editorial";
import { number, round, score, sentence } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
import { courtPhotos } from "@/lib/imagery";
import { tournamentDirectory } from "@/lib/tournament-directory";
import "./rally-overview.css";

export const revalidate = 300;

export default async function Home() {
  const [matches, finals, topTen, fewerPoints] = await Promise.all([
    preparedArchive(),
    recordView(JSON.stringify({ dato: "finales-ganadas" })),
    recordView(JSON.stringify({ dato: "top-10" })),
    recordView(JSON.stringify({ dato: "ganar-con-menos-puntos" })),
  ]);
  const recent = [...matches].sort((a, b) => chronological(b, a));
  const featured = recent.find((match) => roundPosition(match.round) === 7);
  const event = featured
    ? tournamentDirectory(matches).find((entry) => entry.name === featured.tournament)
    : undefined;
  const lead = fewerPoints.piece?.leader;
  const proof = lead?.proof;
  const winner = proof ? winnerName(proof) : null;
  const loser = proof && winner
    ? [proof.player1.name, proof.player2.name].find((name) => name !== winner)
    : null;
  const winnerPortrait = winner ? playerPhoto(winner) : null;
  const pairNames = ["Novak Djokovic", "Rafael Nadal"] as const;
  const pairMatches = matches.filter((match) =>
    (match.player1.name === pairNames[0] && match.player2.name === pairNames[1]) ||
    (match.player1.name === pairNames[1] && match.player2.name === pairNames[0]));
  const rivalry = pairMatches.length ? {
    names: pairNames,
    matches: pairMatches,
    wins: pairNames.map((name) => pairMatches.filter((match) => winnerName(match) === name).length),
    slug: "novak-djokovic--rafael-nadal",
  } : null;
  const topTenRows = topTen.rows.slice(0, 5);
  const topTenCeiling = Math.max(1, ...topTenRows.map((row) => row.value));

  return <div className="deuce-home">
    {proof && winner && loser && lead ? <section className={`dh-lead${winnerPortrait ? " dh-has-image" : ""}`} aria-labelledby="dh-lead-title">
      <div className="dh-lead-copy">
        <p className="dh-lead-context"><i className={`dh-surface-dot dh-surface-${proof.surface}`} aria-hidden="true" />{tournamentName(proof.tournament)} · {proof.year} · {round(proof)}</p>
        <h1 id="dh-lead-title">{winner} ganó con <span>{number(lead.value)} puntos menos.</span></h1>
        <p className="dh-lead-rival">Contra {loser}</p>
        <p className="dh-lead-score">{score(proof)}</p>
        <div className="dh-lead-bottom"><Link href={`/match/${proof.match_id}`} className="dh-action">Ver el partido</Link><span>{number(fewerPoints.piece!.sample)} partidos con puntos totales publicados</span></div>
      </div>
      {winnerPortrait && <div className="dh-lead-visual"><Image src={winnerPortrait.src} alt={winner} fill sizes="(max-width: 759px) 100vw, (max-width: 1099px) 48vw, 600px" priority unoptimized /></div>}
    </section> : <header className="dh-fallback"><h1>Resultados con contexto.</h1><p>Grand Slams, Masters y ATP en el archivo DEUCE.</p></header>}

    <div className="dh-feature-grid">
      {featured && <section className="dh-final" aria-labelledby="dh-final-title">
        <div className="dh-final-top"><div><h2 id="dh-final-title">{tournamentName(featured.tournament)} · {featured.year}</h2><p><i className={`dh-surface-dot dh-surface-${featured.surface}`} aria-hidden="true" />Final · {({ hard: "Pista dura", clay: "Tierra", grass: "Hierba" } as const)[featured.surface]}</p></div>{event && <Link href={`/${event.slug}/${featured.year}`}>Ver edición</Link>}</div>
        <div className="dh-final-score" role="group" aria-label={`${featured.player1.name} contra ${featured.player2.name}. ${score(featured)}`}>
          {[featured.player1, featured.player2].map((player, index) => {
            const photo = playerPhoto(player.name);
            const won = featured.winner === index + 1;
            return <Link className={`dh-final-player${won ? " dh-final-winner" : ""}`} href={`/players/${playerSlug(player.name)}`} key={player.name}>
              <span className="dh-final-identity">{photo && <Image src={photo.thumbnail || photo.src} alt="" width={48} height={48} sizes="48px" unoptimized />}<strong>{player.name}</strong></span>{won && <small>Ganador</small>}
            </Link>;
          })}
        </div>
        <p className="dh-final-result"><span>Marcador de {featured.player1.name}</span><strong>{score(featured)}</strong></p>
        {sentence(featured) && <p className="dh-final-sentence">{sentence(featured)}</p>}
        <Link className="dh-text-link" href={`/match/${featured.match_id}`}>Leer el partido</Link>
      </section>}
      {rivalry && <section className="dh-rivalry" aria-labelledby="dh-rivalry-title">
        <div className="dh-rivalry-heading"><h2 id="dh-rivalry-title">Djokovic contra Nadal</h2><div className="dh-rivalry-portraits" aria-hidden="true">{rivalry.names.map((name) => { const photo = playerPhoto(name); return photo && <Image key={name} src={photo.thumbnail || photo.src} alt="" width={64} height={64} sizes="64px" unoptimized />; })}</div></div>
        <p className="dh-rivalry-score" aria-label={`${rivalry.wins[0]} victorias de Djokovic y ${rivalry.wins[1]} de Nadal`}>{rivalry.wins[0]}–{rivalry.wins[1]}</p><p className="dh-rivalry-scope">{number(rivalry.matches.length)} partidos en este archivo. No es toda la carrera.</p>
        <div className="dh-rivalry-splits">{(["hard", "clay", "grass"] as const).map((surface) => { const wins = rivalry.names.map((name) => rivalry.matches.filter((match) => match.surface === surface && winnerName(match) === name).length); return <div key={surface}><span><i className={`dh-surface-dot dh-surface-${surface}`} aria-hidden="true" />{({ hard: "Dura", clay: "Tierra", grass: "Hierba" } as const)[surface]}</span><strong>{wins[0]}–{wins[1]}</strong></div>; })}</div>
        <Link className="dh-text-link" href={`/rivalries/${rivalry.slug}`}>Ver cara a cara</Link>
      </section>}
    </div>

    {topTenRows.length > 0 && <section className="dh-chart-section" aria-labelledby="dh-chart-title">
      <div className="dh-section-heading"><h2 id="dh-chart-title">Más victorias ante rivales del top 10</h2><Link href="/records?dato=top-10">Ver ranking</Link></div>
      <p className="dh-section-context">Ranking del rival en la fecha del partido · solo partidos con dato</p>
      <div className="dh-chart" aria-label="Victorias ante rivales del top 10">
        {topTenRows.map((row, index) => { const photo = playerPhoto(row.name); return <Link href={row.href} className="dh-chart-row" key={row.name} aria-label={`${row.name}: ${number(row.value)} victorias en ${number(row.sample)} partidos con ranking del rival`}>
          <span className="dh-chart-identity"><small>{index + 1}</small>{photo && <Image src={photo.thumbnail || photo.src} alt="" width={40} height={40} sizes="40px" unoptimized />}<span><strong>{row.name}</strong><em>{number(row.sample)} partidos con dato</em></span></span><span className="dh-chart-track"><span style={{ width: `${Math.max(2, row.value / topTenCeiling * 100)}%` }} /></span><strong>{number(row.value)}</strong>
        </Link>; })}
      </div>
    </section>}

    <section className="dh-results" aria-labelledby="dh-results-title"><div className="dh-section-heading"><h2 id="dh-results-title">Últimos resultados</h2><Link href="/buscar">Todos los partidos</Link></div><div className="dh-results-list">{recent.slice(0, 5).map((match) => <Row match={match} key={match.match_id} />)}</div></section>

    <div className="dh-bottom-grid">
      {finals.piece && <section className="dh-finalists" aria-labelledby="dh-finalists-title"><div className="dh-section-heading"><h2 id="dh-finalists-title">Más finales ganadas</h2><Link href="/records?dato=finales-ganadas">Ver ranking</Link></div><p className="dh-section-context">{finals.piece.years} · mínimo 5 finales · este archivo</p><ol>{finals.rows.slice(0, 5).map((row, index) => <li key={row.name}><Link href={row.href}><span className="dh-ranking-position">{index + 1}</span><span className="dh-ranking-name">{row.name}</span><strong>{number(row.value)}</strong></Link></li>)}</ol></section>}
      <Link href="/wimbledon/2008" className="dh-court-feature"><span className="dh-court-image"><Image src={courtPhotos.Wimbledon.src} alt="Pista de hierba de Wimbledon" fill sizes="(max-width: 759px) calc(100vw - 40px), 42vw" /></span><span className="dh-court-copy"><strong>Wimbledon 2008</strong><span>La final y el camino del campeón</span></span></Link>
    </div>

    <nav className="dh-quick-links" aria-label="Más estadísticas"><Link href="/records?dato=ganar-con-menos-puntos">Victorias con menos puntos</Link><Link href="/records?dato=finales-remontadas-primer-set">Finales remontadas</Link><Link href="/records?dato=breaks-salvados-victoria">Breaks salvados</Link><Link href="/tournaments">Torneos</Link></nav>
  </div>;
}
