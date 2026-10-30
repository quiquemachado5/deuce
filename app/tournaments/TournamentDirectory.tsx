import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { calendarOrder } from '@/lib/presentation-calendar';
import { latestTournamentCourt } from '@/lib/tournament-presentation';
import { preparedTourArchive } from '@/lib/revista/read-records';
import { courtPhoto } from '@/lib/imagery';
import { tournamentName } from '@/lib/labels';
import { surfaceLabel } from '@/lib/cuaderno/model';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { Pagination } from '@/components/nocturno/Row';
import { ArchivePage } from '@/components/deuce/ArchivePage';
import TournamentGallery, { type TournamentGalleryCard } from '@/components/TournamentGallery';
import TournamentBrowsePicker from '@/components/TournamentBrowsePicker';
import { winnerName, roundPosition } from '@/lib/editorial';
import styles from './tournament-directory.module.css';

type Tour = 'atp' | 'wta';
type Query = { circuito?: string; categoria?: string; page?: string };
type Props = { searchParams: Promise<Query> };
const categories: Record<Tour, readonly string[]> = {
  atp: ['Grand Slam', 'Masters 1000', 'ATP 500', 'ATP 250'],
  wta: ['Grand Slam', 'WTA 1000', 'WTA 500', 'WTA 250', 'WTA 125', 'WTA · alto nivel histórico', 'WTA Tour histórico'],
};
const categoryLabel = (category: string) => category === 'Grand Slam' ? 'Grand Slams' : category;
const tourFrom = (value?: string): Tour => value === 'wta' ? 'wta' : 'atp';
const directoryUrl = (tour: Tour, category?: string, page = 1) => {
  const params = new URLSearchParams();
  params.set('circuito', tour);
  if (category) params.set('categoria', category);
  if (page > 1) params.set('page', String(page));
  return `/torneos?${params}`;
};

function latestPlayed(entry: ReturnType<typeof tournamentDirectory>[number], category: string) {
  return entry.matches.filter(match => match.category === category).reduce((latest, match) => {
    const exact = Date.parse(match.context?.date || match.score_summary.timestamp);
    return Math.max(latest, Number.isFinite(exact) ? exact : Date.UTC(match.year, 0, 1));
  }, 0);
}

export async function generateMetadata({ searchParams }: Props) {
  const query = await searchParams;
  const tour = tourFrom(query.circuito);
  const category = categories[tour].find(value => value === query.categoria);
  const title = `${category ? `${categoryLabel(category)} · ` : ''}Torneos ${tour.toUpperCase()} — DEUCE`;
  const description = `Torneos y ediciones ${tour.toUpperCase()} del archivo, sin mezclar los resultados de ambos circuitos.`;
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const canonical = directoryUrl(tour, category, page);
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical }, twitter: { card: 'summary_large_image', title, description } };
}

export default async function TournamentDirectory({ searchParams }: Props) {
  const query = await searchParams;
  const tour = tourFrom(query.circuito);
  const matches = await preparedTourArchive(tour);
  const latestArchiveYear = matches.reduce((latest, match) => Math.max(latest, match.year), 0);
  const entries = calendarOrder(tournamentDirectory(matches));
  const levels = categories[tour];
  const chosen = levels.find(category => category === query.categoria);
  const belongsToLevel = (entry: typeof entries[number], level: string) =>
    entry.categories.includes(level) && (tour === 'wta' || level === 'Grand Slam' || level === 'Masters 1000' || entry.latestYear >= latestArchiveYear - 1);
  const primaryLevelBySlug = new Map(entries.map(entry => [entry.slug, levels.find(level => belongsToLevel(entry, level))]));
  const selected = chosen
    ? entries.filter(entry => belongsToLevel(entry, chosen))
    : entries.filter(entry => primaryLevelBySlug.get(entry.slug));
  const pages = Math.max(1, Math.ceil(selected.length / 25));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(query.page) || 1)));
  const entryBySlug = new Map(entries.map(entry => [entry.slug, entry]));
  const cards: TournamentGalleryCard[] = (chosen ? selected.slice((page - 1) * 25, page * 25) : selected).map(entry => {
    const activeCategory = chosen || primaryLevelBySlug.get(entry.slug);
    const filtered = activeCategory ? entry.matches.filter(match => match.category === activeCategory) : entry.matches;
    const court = latestTournamentCourt(filtered);
    const latestFinal = filtered.filter(match => roundPosition(match.round) === 7)
      .sort((a, b) => b.year - a.year || b.score_summary.timestamp.localeCompare(a.score_summary.timestamp))[0];
    const venuePhoto = courtPhoto(entry.name);
    const params = new URLSearchParams({ cuadro: tour });
    if (activeCategory) params.set('categoria', activeCategory);
    return {
      surface: court.surface, id: entry.slug, title: tournamentName(entry.name),
      image: venuePhoto?.src, alt: venuePhoto?.alt,
      imagePosition: venuePhoto?.objectPosition || 'center top',
      imagePositionMobile: venuePhoto?.mobileObjectPosition || venuePhoto?.objectPosition || 'center top',
      champion: latestFinal ? winnerName(latestFinal) : null,
      championYear: latestFinal?.year, court: surfaceLabel[court.surface],
      href: `/torneos/${entry.slug}?${params}`,
    };
  });
  const tools = <TournamentBrowsePicker selection={`${tour.toUpperCase()} · ${chosen ? categoryLabel(chosen) : 'Principales'}`} groups={(['atp', 'wta'] as const).map(value => ({
    label: value.toUpperCase(),
    items: [
      { href: directoryUrl(value), label: 'Principales', active: tour === value && !chosen },
      ...categories[value].map(category => ({ href: directoryUrl(value, category), label: categoryLabel(category), active: tour === value && chosen === category })),
    ],
  }))} />;
  const orderedCards = chosen ? cards.sort((a, b) => latestPlayed(entryBySlug.get(b.id)!, chosen) - latestPlayed(entryBySlug.get(a.id)!, chosen)) : cards;

  return <ArchivePage title="Torneos" className={styles.page} tools={tools}><div className={styles.content}>
    {chosen ? <section className={styles.selected} aria-labelledby="selected-tournaments">
      <div className={styles.groupHeader}><h2 id="selected-tournaments">{categoryLabel(chosen)}</h2><span className={styles.count}>{selected.length} torneos · {tour.toUpperCase()}</span></div>
      <TournamentGallery cards={orderedCards} variant={chosen === 'Grand Slam' ? 'majors' : chosen.endsWith('250') ? 'compact' : 'rail'} label={categoryLabel(chosen)} />
    </section> : <div className={styles.groups}>{levels.map((category, index) => {
      const group = cards.filter(card => primaryLevelBySlug.get(card.id) === category)
        .sort((a, b) => latestPlayed(entryBySlug.get(b.id)!, category) - latestPlayed(entryBySlug.get(a.id)!, category));
      return group.length ? <section className={styles.group} key={category} aria-labelledby={`group-${index}`}>
        <div className={styles.groupHeader}><h2 id={`group-${index}`}>{categoryLabel(category)}</h2><Link className={styles.allLink} href={directoryUrl(tour, category)}><span>Ver todos</span><ArrowRight size={16} aria-hidden="true" /></Link></div>
        <TournamentGallery cards={group} variant={index === 0 ? 'majors' : index === 1 ? 'rail' : 'compact'} label={categoryLabel(category)} />
      </section> : null;
    })}</div>}
    {!selected.length ? <div className={styles.empty}><h2>Sin torneos {tour.toUpperCase()} disponibles</h2><p>{tour === 'wta' ? 'La importación de este circuito sigue en curso. Ningún resultado ATP se muestra como WTA.' : 'Prueba otra categoría del circuito.'}</p><Link href={directoryUrl(tour)}>Ver categorías {tour.toUpperCase()}</Link></div> : null}
    {chosen ? <Pagination page={page} total={selected.length} href={next => directoryUrl(tour, chosen, next)} /> : null}
  </div></ArchivePage>;
}
