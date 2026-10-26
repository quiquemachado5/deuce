import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { preparedEditionAudit, preparedTournamentArchive } from "@/lib/revista/read-records";
import { tournamentName } from "@/lib/labels";
import {
  categoryLabel,
  categoryYears,
  tournamentDirectory,
} from "@/lib/tournament-directory";
import { roundLabel, roundPosition, durationLabel, winnerName } from "@/lib/editorial";
import { eligibleMatch } from "@/lib/quality";
import { lostOpening } from "@/lib/archive-insights";
import { closeness, number, surfaceLabel } from "@/lib/cuaderno/model";
import { editionTournamentCourt } from "@/lib/tournament-presentation";
import { courtPhoto, courtPhotoForEdition } from "@/lib/imagery";
import Row from "@/components/nocturno/Row";
import EditionPicker from "@/components/EditionPicker";
import TournamentFinal from "@/components/TournamentFinal";
import EditionMatchExplorer from "@/components/EditionMatchExplorer";
import { toMatchRecord } from "@/data/map-match";
import { publishedMatchMinutes } from "@/lib/duration";
import { Breadcrumbs } from "@/components/deuce/Breadcrumbs";
import { editionCompleteness } from "@/lib/edition-audit";
import { mediaForEdition } from "@/lib/tournament-media";
import TournamentEditionMediaView from "@/components/TournamentEditionMedia";

type Props = {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ categoria?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const tournament = tournamentDirectory(await preparedTournamentArchive()).find(
    (entry) => entry.slug === slug,
  );
  const options =
    tournament?.matches.filter((match) => match.year === Number(year)) || [];
  const level =
    query.categoria &&
    options.some((match) => match.category === query.categoria)
      ? query.categoria
      : options[0]?.category;
  const canonicalParams = new URLSearchParams();
  if (level && new Set(options.map((match) => match.category)).size > 1)
    canonicalParams.set("categoria", level);
  const title = `${tournament ? tournamentName(tournament.name) : "Edición"} ${year}${level ? ` · ${categoryLabel(level)}` : ""} — DEUCE`;
  const description = "La final, el camino del campeón y los resultados de esta edición.";
  return {
    title,
    description,
    alternates: {
      canonical: `/torneos/${slug}/${year}${canonicalParams.size ? `?${canonicalParams}` : ""}`,
    },
    openGraph: { title, description, url: `/torneos/${slug}/${year}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Edition({ params, searchParams }: Props) {
  const { slug, year } = await params;
  const query = await searchParams;
  const [archive,audits]=await Promise.all([preparedTournamentArchive(),preparedEditionAudit()]);
  const tournament = tournamentDirectory(archive).find(
    (entry) => entry.slug === slug,
  );
  if (!tournament || !/^\d{4}$/.test(year)) notFound();
  const edition = tournament.matches.filter(
    (match) => match.year === Number(year),
  );
  const categories = [...new Set(edition.map((match) => match.category))];
  const category =
    query.categoria && categories.includes(query.categoria)
      ? query.categoria
      : categories[0];
  const matches = edition.filter((match) => match.category === category);
  if (!matches.length) notFound();
  const court = editionTournamentCourt(matches);
  const storedAudit=audits.find(audit=>audit.tournament===tournament.name&&audit.year===Number(year)&&audit.category===category);
  const audit=storedAudit?{...storedAudit,...editionCompleteness(storedAudit)}:null;
  const final = matches.find((match) => roundPosition(match.round) === 7);
  const measuredMatches=matches.filter(eligibleMatch);
  const comeback =
    measuredMatches
      .filter((match) => lostOpening(match, 2))
      .sort((a, b) => closeness(b) - closeness(a))[0] ||
    measuredMatches
      .filter((match) => lostOpening(match))
      .sort((a, b) => closeness(b) - closeness(a))[0];
  const closest = [...measuredMatches].sort((a, b) => closeness(b) - closeness(a))[0];
  const timed = measuredMatches
    .filter((match) => publishedMatchMinutes(match) !== null)
    .sort((a, b) => publishedMatchMinutes(b)! - publishedMatchMinutes(a)!);
  const photo = tournament.canonical
    ? courtPhotoForEdition(tournament.name, Number(year)) || (Number(year)>=2023 ? courtPhoto(tournament.name) : null)
    : null;
  const editionMedia=mediaForEdition(tournament.name,Number(year));
  const moments = [
    comeback ? { match: comeback, label: "Remontada" } : null,
    closest
      ? {
          match: closest,
          label: `Marcador más ajustado · ${number(closeness(closest))} / 100`,
        }
      : null,
    timed[0]
      ? {
          match: timed[0],
          label: `Mayor duración publicada · ${durationLabel(publishedMatchMinutes(timed[0])!)}`,
        }
      : null,
  ].filter(
    (moment): moment is { match: (typeof matches)[number]; label: string } =>
      Boolean(moment),
  );
  const uniqueMoments = [
    ...new Map(
      moments.map((moment) => [
        moment.match.match_id,
        {
          match: moment.match,
          labels: moments
            .filter(
              (candidate) => candidate.match.match_id === moment.match.match_id,
            )
            .map((candidate) => candidate.label),
        },
      ]),
    ).values(),
  ];
  const champion=final?winnerName(final):null;
  const editionResults=matches.filter(match=>roundPosition(match.round)>0).sort((a,b)=>roundPosition(b.round)-roundPosition(a.round)||b.score_summary.timestamp.localeCompare(a.score_summary.timestamp)).map(match=>({key:String(roundPosition(match.round)),label:roundLabel(match.round),position:roundPosition(match.round),championPath:Boolean(champion&&winnerName(match)===champion),match:toMatchRecord(match)}));
  return (
    <div
      className="nc-wrap ry-photo-edition td-edition"
      data-event-category={category}
      data-event-surface={court.surface}
    >
      <header
        className={`td-edition-hero${photo ? " td-edition-hero-photo" : ""}`} data-grand-slam={category === "Grand Slam"}
      >
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 759px) calc(100vw - 32px), 1240px"
            priority
          />
        )}
        <div className="td-edition-hero-copy">
          <Breadcrumbs className="td-breadcrumb" items={[{label:'Torneos',href:'/torneos'},{label:tournamentName(tournament.name),href:`/torneos/${slug}`},{label:year}]}/>
          <h1>
            {tournamentName(tournament.name)} <span>{year}</span>
          </h1>
          <p className="td-hero-court">
            <i
              className={`nc-dot nc-dot-${court.surface}`}
              aria-hidden="true"
            />
            {surfaceLabel[court.surface]}
            {court.indoor === true && (
              <span>· {court.indoor ? "Bajo techo" : ""}</span>
            )}
            <span>· {number(matches.length)} resultados registrados</span>
          </p>
        </div>
      </header>

      {categories.length > 1 && (
        <nav
          className="ry-tournament-levels"
          aria-label="Categorías de esta edición"
        >
          {categories.map((level) => (
            <Link
              key={level}
              data-event-category={level}
              aria-current={level === category ? "page" : undefined}
              href={`/torneos/${slug}/${year}?categoria=${encodeURIComponent(level)}`}
            >
              {categoryLabel(level)}
            </Link>
          ))}
        </nav>
      )}
      <nav className="td-edition-context" aria-label="Vista del torneo">
        <Link href={`/torneos/${slug}${tournament.categories.length > 1 ? `?categoria=${encodeURIComponent(category)}` : ""}`}>Resumen del torneo</Link>
        <span aria-current="page">Edición {year}</span>
      </nav>
      {audit&&<div className={`td-coverage-status${audit.completeDraw===false?' is-warning':' is-complete'}`} role="status"><strong>{audit.completeDraw===false?'Edición incompleta en la fuente':'Cuadro final verificado'}</strong><span>{audit.completeDraw===false?`Revisión automática: ${[...audit.missingLateRounds,audit.pending?`${audit.pending} marcadores pendientes`:null].filter(Boolean).join(' · ')}.`:`Cuartos, semifinales y final presentes · ${number(audit.completed)} partidos completos y ${number(audit.terminal)} retiradas o encuentros sin jugar.`}</span><Link href="/cobertura#ediciones">Cómo se controla</Link></div>}
      <section className="td-editions td-editions--switch" aria-label="Cambiar edición">
        <div><h2>Cambiar de edición</h2><p>Consulta otro año sin perder el contexto del torneo.</p></div>
        <EditionPicker
          slug={slug}
          years={categoryYears(tournament, category)}
          currentYear={Number(year)}
          masters={category === "Precursores de Masters"}
          category={tournament.categories.length > 1 ? category : undefined}
        />
      </section>
      {final && <TournamentFinal match={final} />}
      {editionMedia && <TournamentEditionMediaView media={editionMedia} />}
      <EditionMatchExplorer results={editionResults} />
      {uniqueMoments.length > 0 && (
        <section className="nc-section nc-edition-facts td-edition-moments">
          <div className="td-section-heading">
            <div>
              <h2>Lecturas de la edición</h2>
            </div>
          </div>
          {uniqueMoments.map(({ match, labels }) => (
            <div key={match.match_id}>
              <h3>{labels.join(" · ")}</h3>
              {match.match_id === closest?.match_id && (
                <p className="nc-meta">
                  El ajuste se basa solo en el tanteo; no mide la importancia
                  del partido.
                </p>
              )}
              {match.match_id === timed[0]?.match_id && (
                <p className="nc-meta">
                  {number(timed.length)} partidos de esta edición tienen
                  duración publicada.
                </p>
              )}
              <Row match={match} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
