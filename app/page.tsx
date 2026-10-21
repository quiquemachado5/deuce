import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { preparedGeneration, recordView } from '@/lib/revista/read-records';
import Row from '@/components/nocturno/Row';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import HomeHighlights, { type HomeHighlight } from '@/components/HomeHighlights';
import TourActivity from '@/components/TourActivity';
import ScoreText from '@/components/ScoreText';
import HomeFinalScore from '@/components/HomeFinalScore';
import { playerPhoto } from '@/lib/player-imagery';
import { chronological, roundPosition, winnerName } from '@/lib/editorial';
import { number, round, score } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { courtPhoto, courtPhotos } from '@/lib/imagery';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { eligibleMatch } from '@/lib/quality';
import './rally-overview.css';

export const revalidate = 300;

export default async function Home() {
  const [generation, topTen] = await Promise.all([
    preparedGeneration(),
    recordView(JSON.stringify({ dato: 'top-10' })),
  ]);
  const matches = await generation.matches();
  const manifest = generation.manifest;
  const recent = [...matches].sort((a, b) => chronological(b, a));
  const record = (id: string) => manifest.pieces.find(piece => piece.id === id);
  const longest = record('mas-largos');
  const longestMatch = longest?.leader?.proof;
  const longestPhoto = longestMatch ? courtPhoto(longestMatch.tournament) : null;
  const recentFinal = recent.find(match => roundPosition(match.round) === 7 && eligibleMatch(match));
  const finalEvent = recentFinal
    ? tournamentDirectory(matches).find(event => event.name === recentFinal.tournament)
    : null;

  const storyIds = ['remontada-dos-sets', 'mas-juegos', 'tie-breaks', 'finales-ganadas', 'top-10', 'ganar-con-menos-puntos'];
  const stories: HomeHighlight[] = storyIds.flatMap(id => {
    const piece = record(id);
    const leader = piece?.leader;
    if (!piece || !leader) return [];
    return [{
      id,
      title: piece.title,
      name: leader.name,
      value: leader.display || `${number(leader.value)}${piece.percent ? ' %' : ''}`,
      detail: leader.detail,
      sample: `${piece.years} · ${number(piece.sample)} partidos con dato`,
      href: `/records?dato=${id}`,
    }];
  });

  const pairNames = ['Novak Djokovic', 'Rafael Nadal'] as const;
  const pair = matches.filter(match =>
    (match.player1.name === pairNames[0] && match.player2.name === pairNames[1]) ||
    (match.player1.name === pairNames[1] && match.player2.name === pairNames[0]),
  );
  const pairWins = pairNames.map(name => pair.filter(match => winnerName(match) === name).length);
  const surfaceSplits = SURFACES.map(surface => ({
    surface,
    wins: pairNames.map(name => pair.filter(match => match.surface === surface && winnerName(match) === name).length),
  })).filter(split => split.wins[0] + split.wins[1] > 0);
  const rows = topTen.rows.slice(0, 5);
  const ceiling = Math.max(1, ...rows.map(row => row.value));
  const playerCount = new Set(matches.flatMap(match => [match.player1.name, match.player2.name])).size;

  return <div className="deuce-home ds-home">
    <ArchiveNotice status={generation} />

    {longest?.leader && longestMatch ? <section className="ds-hero-record" aria-labelledby="ds-hero-title">
      <div className="ds-hero-copy">
        <p className="ds-hero-context">El partido más largo entre {number(longest.sample)} con duración publicada</p>
        <h1 id="ds-hero-title">{longest.leader.display || `${number(longest.leader.value)} min`}</h1>
        <p className="ds-hero-names">{longestMatch.player1.name} <span>contra</span> {longestMatch.player2.name}</p>
        <p className="ds-hero-meta">{tournamentName(longestMatch.tournament)} · {longestMatch.year} · {round(longestMatch)}</p>
        <p className="ds-hero-score"><ScoreText value={score(longestMatch)} /></p>
        <Link className="ds-hero-action" href={`/match/${longestMatch.match_id}`}>Leer el partido</Link>
      </div>
      {longestPhoto && <div className="ds-hero-photo">
        <Image src={longestPhoto.src} alt={longestPhoto.alt} fill sizes="(max-width: 759px) 100vw, (max-width: 1099px) 50vw, 540px" priority loading="eager" />
      </div>}
    </section> : <header className="ds-hero-fallback"><h1>Los partidos detrás de cada cifra.</h1><Link href="/records">Ver estadísticas</Link></header>}

    <div className="ds-archive-line">
      <p>{number(matches.length)} partidos · {number(playerCount)} jugadores · Grand Slams y torneos ATP de este archivo</p>
      <Link href="/cobertura">Qué incluye el archivo</Link>
    </div>

    <div className="ds-main-grid">
      <section className="ds-results-section" aria-labelledby="ds-results-title">
        <div className="ds-section-heading"><h2 id="ds-results-title">Últimos resultados</h2><Link href="/buscar">Todos los partidos</Link></div>
        <div className="ds-results-list">{recent.slice(0, 5).map(match => <Row key={match.match_id} match={match} />)}</div>
        <details className="ds-more-results"><summary>Ver cinco más</summary>{recent.slice(5, 10).map(match => <Row key={match.match_id} match={match} />)}</details>
      </section>
      <Suspense fallback={<p className="ds-tour-empty" role="status">Consultando agenda guardada…</p>}>
        <TourActivity matches={matches} />
      </Suspense>
    </div>

    <div className="ds-analysis-grid">
      <section className="ds-rivalry-feature" aria-labelledby="ds-rivalry-title">
        <div className="ds-section-heading"><h2 id="ds-rivalry-title">Djokovic contra Nadal</h2><Link href="/rivalries/novak-djokovic--rafael-nadal">Ver cara a cara</Link></div>
        <div className="ds-rivalry-lead">
          {pairNames.map((name, index) => {
            const photo = playerPhoto(name);
            return <div className="ds-rivalry-player" key={name}>
              {photo && <Image src={photo.thumbnail || photo.src} width={88} height={88} alt="" unoptimized />}
              <span>{name}</span><strong>{number(pairWins[index])}</strong>
            </div>;
          })}
        </div>
        <p className="ds-rivalry-scope">{number(pair.length)} partidos de este archivo. No es toda la carrera.</p>
        <div className="ds-rivalry-splits">{surfaceSplits.map(({ surface, wins }) => <div key={surface}>
          <span><i className={`nc-dot nc-dot-${surface}`} aria-hidden="true" />{surfaceLabel[surface]}</span>
          <strong>{wins.join('–')}</strong>
        </div>)}</div>
      </section>
      <section className="ds-ranking-section" aria-labelledby="ds-top-title">
        <div className="ds-section-heading"><h2 id="ds-top-title">Victorias ante el top 10</h2><Link href="/records?dato=top-10">Clasificación</Link></div>
        <p className="ds-ranking-scope">Solo partidos con ranking del rival en la fecha del encuentro.</p>
        <div className="ds-ranking-chart">{rows.map((row, index) => <Link href={row.href} key={row.name} aria-label={`${row.name}: ${number(row.value)} victorias en ${number(row.sample)} partidos con dato`}>
          <span className="ds-rank-position">{number(index + 1)}</span>
          <span className="ds-rank-name">{row.name}<small>{number(row.sample)} con ranking</small></span>
          <span className="ds-rank-track" aria-hidden="true"><i style={{ width: `${row.value / ceiling * 100}%` }} /></span>
          <strong className="ds-rank-value">{number(row.value)}</strong>
        </Link>)}</div>
      </section>
    </div>

    <HomeHighlights slides={stories} />

    <div className="ds-home-end">
      {recentFinal && <section className="ds-latest-final" data-event-surface={recentFinal.surface}>
        <div className="ds-section-heading"><h2>Última final registrada</h2>{finalEvent && <Link href={`/${finalEvent.slug}/${recentFinal.year}`}>Ver edición</Link>}</div>
        <p className="ds-final-event"><i className={`nc-dot nc-dot-${recentFinal.surface}`} aria-hidden="true" />{tournamentName(recentFinal.tournament)} · {recentFinal.year}</p>
        <HomeFinalScore match={recentFinal} />
        <Link className="ds-final-open" href={`/match/${recentFinal.match_id}`}>Leer la final</Link>
      </section>}
      <Link className="ds-court-link" href="/wimbledon/2008">
        <Image src={courtPhotos.Wimbledon.src} alt={courtPhotos.Wimbledon.alt} fill sizes="(max-width: 759px) 100vw, 500px" />
        <span>Wimbledon 2008 <strong>La final y el camino del campeón</strong></span>
      </Link>
    </div>
    <nav className="ds-home-links" aria-label="Más formas de explorar">
      <Link href="/jugadores">Jugadores</Link><Link href="/tournaments">Torneos</Link><Link href="/comparar">Comparar jugadores</Link><Link href="/records">Todas las estadísticas</Link>
    </nav>
  </div>;
}
