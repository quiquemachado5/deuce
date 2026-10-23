import Link from 'next/link';
import { Suspense } from 'react';
import { preparedGeneration, recordView } from '@/lib/revista/read-records';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import HomeHighlights, { type HomeHighlight } from '@/components/HomeHighlights';
import TourActivity from '@/components/TourActivity';
import PlayerAvatar from '@/components/PlayerAvatar';
import HomeIntro from '@/components/HomeIntro';
import HomeSeason from '@/components/HomeSeason';
import { playerPhoto } from '@/lib/player-imagery';
import { chronological, winnerName } from '@/lib/editorial';
import { number } from '@/lib/cuaderno/model';
import MatchCard from '@/components/MatchCard';
import QuickH2H from '@/components/QuickH2H';
import HomeExplore from '@/components/HomeExplore';
import PlayerCountryFlag from '@/components/PlayerCountryFlag';

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

  const storyIds = ['remontada-dos-sets', 'mas-juegos', 'tie-breaks', 'finales-ganadas', 'top-10', 'ganar-con-menos-puntos', 'mas-largos', 'rachas', 'victorias-temporada', 'temporadas-titulos'];
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

  const rows = topTen.rows.slice(0, 5);
  const ceiling = Math.max(1, ...rows.map(row => row.value));

  return <div className="deuce-home ds-home">
    <ArchiveNotice status={generation} />

    <HomeIntro count={manifest.matchCount} firstYear={manifest.years.at(-1) || 1968} />

    <HomeHighlights slides={stories} />

    <div className="ds-main-grid">
      <section className="ds-results-section" aria-labelledby="ds-results-title">
        <div className="ds-section-heading"><h2 id="ds-results-title">Últimos resultados</h2><Link href="/buscar">Todos los partidos</Link></div>
        <div className="ds-match-grid">{recent.slice(0, 6).map(match => <MatchCard key={match.match_id} match={match} />)}</div>
        <details className="ds-more-results"><summary>Ver seis más</summary><div className="ds-match-grid ds-match-grid-more">{recent.slice(6, 12).map(match => <MatchCard key={match.match_id} match={match} />)}</div></details>
      </section>
      <Suspense fallback={<p className="ds-tour-empty" role="status">Consultando agenda guardada…</p>}>
        <TourActivity matches={matches} />
      </Suspense>
    </div>

    <div className="ds-analysis-grid">
      <QuickH2H />
      <section className="ds-ranking-section" aria-labelledby="ds-top-title">
        <div className="ds-section-heading"><h2 id="ds-top-title">Victorias ante el top 10</h2><Link href="/records?dato=top-10">Clasificación</Link></div>
        <div className="ds-ranking-chart">{rows.map((row, index) => <Link href={row.href} key={row.name} aria-label={`${row.name}: ${number(row.value)} victorias en ${number(row.sample)} partidos con dato`}>
          <span className="ds-rank-position">{number(index + 1)}</span>
          <span className="ds-rank-name"><span className="ds-rank-avatar"><PlayerAvatar name={row.name} size={34} /></span><PlayerCountryFlag name={row.name} /><span>{row.name}<small>{number(row.sample)} partidos con ranking</small></span></span>
          <span className="ds-rank-track" aria-hidden="true"><i style={{ width: `${row.value / ceiling * 100}%` }} /></span>
          <strong className="ds-rank-value">{number(row.value)}</strong>
        </Link>)}</div>
      </section>
    </div>

    <HomeSeason matches={matches} />
    <HomeExplore matches={matches} />
  </div>;
}
