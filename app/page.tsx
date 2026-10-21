import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { preparedGeneration, recordView } from '@/lib/revista/read-records';
import Row from '@/components/nocturno/Row';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import HomeHighlights, { type HomeHighlight } from '@/components/HomeHighlights';
import TourActivity from '@/components/TourActivity';
import PlayerAvatar from '@/components/PlayerAvatar';
import PhotoInfo from '@/components/PhotoInfo';
import HomeFinalScore from '@/components/HomeFinalScore';
import { playerPhoto } from '@/lib/player-imagery';
import { chronological, winnerName } from '@/lib/editorial';
import { number, round } from '@/lib/cuaderno/model';
import { tournamentName } from '@/lib/labels';
import { courtPhoto, courtPhotos } from '@/lib/imagery';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import { eligibleMatch } from '@/lib/quality';

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
    const recentFinal = recent.find(match => eligibleMatch(match) && match.year <= new Date().getFullYear());
  const finalEvent = recentFinal
    ? tournamentDirectory(matches).find(event => event.name === recentFinal.tournament)
    : null;

  const heroCourt = recentFinal ? courtPhoto(recentFinal.tournament) : null;
  const heroWinner = recentFinal ? winnerName(recentFinal) : '';
  const heroPortrait = heroWinner ? playerPhoto(heroWinner) : null;
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
      photo: playerPhoto(leader.name) || (leader.proof ? playerPhoto(winnerName(leader.proof) || leader.proof.player1.name) : undefined) || undefined,
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

    <header className="ds-home-heading"><h1>El tenis, <span>en otra dimensión.</span></h1><Link href="/buscar">Encuentra un partido</Link></header>
    {recentFinal ? <section className="ds-hero-record" data-event-surface={recentFinal.surface} aria-labelledby="ds-hero-title">
      <div className="ds-hero-copy">
        <p className="ds-hero-context"><i className={`nc-dot nc-dot-${recentFinal.surface}`} aria-hidden="true" />{round(recentFinal)} · {recentFinal.year}</p>
        <h2 id="ds-hero-title">{tournamentName(recentFinal.tournament)}</h2>
        <p className="ds-hero-champion">{heroWinner}</p>
        <p className="ds-hero-meta">Ganador del último encuentro · {recentFinal.category}</p>
        <Link className="ds-hero-action" href={`/match/${recentFinal.match_id}`}>Ver el partido</Link>
        {finalEvent && <Link className="ds-hero-edition" href={`/${finalEvent.slug}/${recentFinal.year}`}>Toda la edición</Link>}
      </div>
      {heroCourt && <div className="ds-hero-court"><Image src={heroCourt.src} alt={heroCourt.alt} fill sizes="(max-width:759px) 100vw, 800px" priority /><PhotoInfo photo={heroCourt} /></div>}
      {heroPortrait && <div className="ds-hero-portrait"><Image src={heroPortrait.src} alt={heroPortrait.alt} fill sizes="(max-width:759px) 160px, 320px" priority unoptimized /><PhotoInfo photo={heroPortrait} /></div>}
      <div className="ds-hero-scoreboard"><HomeFinalScore match={recentFinal} context="partido" /></div>
    </section> : <header className="ds-hero-fallback"><h2>Los partidos detrás de cada cifra.</h2><Link href="/records">Ver estadísticas</Link></header>}

    <div className="ds-archive-line">
      <p>{number(matches.length)} partidos · {number(playerCount)} jugadores · Grand Slams y torneos ATP de este archivo</p>
      <Link href="/cobertura">Qué incluye el archivo</Link>
    </div>

    <HomeHighlights slides={stories} />

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
          <span className="ds-rank-name"><PlayerAvatar name={row.name} size={40} /><span>{row.name}<small>{number(row.sample)} con ranking</small></span></span>
          <span className="ds-rank-track" aria-hidden="true"><i style={{ width: `${row.value / ceiling * 100}%` }} /></span>
          <strong className="ds-rank-value">{number(row.value)}</strong>
        </Link>)}</div>
      </section>
    </div>

    <section className="ds-home-end" aria-label="Tres superficies, tres torneos">
      {[['Wimbledon', '/torneos/wimbledon', 'Hierba', 'grass'], ['Roland Garros', '/torneos/roland-garros', 'Tierra', 'clay'], ['US Open', '/torneos/us-open', 'Dura', 'hard']].map(([name, href, surface, key]) => {
        const photo = courtPhotos[name as keyof typeof courtPhotos];
        return photo ? <Link className="ds-court-link" href={href} key={name} data-event-surface={key}>
          <Image src={photo.src} alt={photo.alt} fill sizes="(max-width:759px) 100vw, 400px" />
          <span>{surface}<strong>{tournamentName(name)}</strong></span>
        </Link> : null;
      })}
    </section>
    <nav className="ds-home-links" aria-label="Más formas de explorar">
      <Link href="/jugadores">Jugadores</Link><Link href="/tournaments">Torneos</Link><Link href="/comparar">Comparar jugadores</Link><Link href="/records">Todas las estadísticas</Link>
    </nav>
  </div>;
}
