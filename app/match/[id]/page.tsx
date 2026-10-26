import { ArrowUpRight } from 'lucide-react';
import ArchiveBackLink from '@/components/ArchiveBackLink';
import ArchiveFreshness from '@/components/ArchiveFreshness';
import { editionNeighbors } from '@/lib/edition-neighbors';
import { preparedManifest } from '@/lib/revista/read-records';
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { preparedArchive, preparedMatch } from "@/lib/revista/read-records";
import Reading, { ReadingHead } from "@/components/nocturno/Reading";
import ReadingLine from "@/components/nocturno/ReadingLine";
import ComparePicker from "@/components/nocturno/Compare";
import type { MatchView } from "@/components/nocturno/MatchTabs";
import {
  neighboringMeetings,
} from "@/lib/editorial";
import { tournamentName } from "@/lib/labels";
import { score } from "@/lib/cuaderno/model";
import { kindShelf, shelves } from "@/lib/cuaderno/shelves";
import { rivalryDirectory } from "@/lib/explore";
import Row from "@/components/nocturno/Row";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ junto?: string; vista?: string }>;
};

// The published snapshot already contains the validated match and its detail.
// Reading it first keeps cold navigations off the slower provider archive path.
const pageMatch = cache(async (id: string) => {
  const matches = await preparedArchive();
  const match = matches.find((item) => item.match_id === id) || await preparedMatch(id);
  return { match, matches };
});

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { id } = await params,
    { junto } = await searchParams,
    { match } = await pageMatch(id);
  if (!match) return { title: "Página no encontrada — DEUCE" };
  const title = `${match.player1.name} – ${match.player2.name} · ${score(match)} · ${tournamentName(match.tournament)} ${match.year} — DEUCE`,
    description =
      "Grand Slams, Masters 1000, ATP 500 y ATP 250, leídos por el dato.",
    canonical = `/match/${id}${junto && junto !== "elige" ? `?junto=${encodeURIComponent(junto)}` : ""}`;
  return {
    title,
    description: `${title.replace(" — DEUCE", "")}. ${description}`,
    alternates: { canonical },
    openGraph: { title, description, images: [`/match/${id}/opengraph-image`], type: "article", url: canonical },
    twitter: { card: "summary_large_image", title, description, images: [`/match/${id}/opengraph-image`] },
  };
}

export default async function MatchPage({ params, searchParams }: Props) {
  const { id } = await params,
    { junto, vista } = await searchParams,
    { match, matches } = await pageMatch(id);
  if (!match) notFound();
  const rivalry = rivalryDirectory(
      matches.filter(
        (item) =>
          (item.player1.name === match.player1.name &&
            item.player2.name === match.player2.name) ||
          (item.player1.name === match.player2.name &&
            item.player2.name === match.player1.name),
      ),
    )[0],
    neighbors = neighboringMeetings(matches, match),
    paths = editionNeighbors(matches,match),
    other =
      junto && junto !== "elige" && junto !== id
        ? matches.find((item) => item.match_id === junto)
        : null,
    situation = shelves.find((shelf) => shelf.id === kindShelf(match)),
    initial = (
      ["resumen", "presion", "medidas", "alrededor"].includes(vista || "")
        ? vista
        : junto
          ? "alrededor"
          : "resumen"
    ) as MatchView;
  const around = (
    <>
      <div className="nc-match-around">
        {(neighbors.previous || neighbors.next) && (
          <section>
            <h2>Entre los mismos</h2>
            {neighbors.previous && (
              <div className="match-history-meeting">
                <span>Enfrentamiento anterior</span>
                <Row
                  match={neighbors.previous}
                  firstPlayer={match.player1.name}
                />
              </div>
            )}
            {neighbors.next && (
              <div className="match-history-meeting">
                <span>Enfrentamiento siguiente</span>
                <Row match={neighbors.next} firstPlayer={match.player1.name} />
              </div>
            )}
          </section>
        )}
        {paths.some(path=>path.previous||path.next) && <section><h2>En esta edición</h2>{paths.map(path=><div key={path.name}><h3>{path.name}</h3>{path.previous&&<div className="match-history-meeting"><span>Ronda anterior registrada</span><Row match={path.previous} firstPlayer={path.name}/></div>}{path.next&&<div className="match-history-meeting"><span>Ronda siguiente registrada</span><Row match={path.next} firstPlayer={path.name}/></div>}</div>)}</section>}
        {situation && (
          <Link href={`/records?dato=${situation.id}`}>{situation.label}</Link>
        )}
        {!junto && (
          <Link href={`/compare?left=${encodeURIComponent(id)}`}>
            Comparar con otro partido
          </Link>
        )}
      </div>
      {junto && (
        <section id="comparar" className="nc-match-compare">
          {other ? (
            <>
              <h2>Comparación de partidos</h2>
              <p className="nc-meta">
                Resultados por set y juegos documentados de cada partido.
              </p>
              <div className="nc-match-comparison">
                {[match, other].map((item) => (
                  <div key={item.match_id}>
                    <ReadingHead match={item} reduced />
                    <ReadingLine match={item} />
                  </div>
                ))}
              </div>
              <Link href={`/compare?left=${encodeURIComponent(id)}`}>
                Elegir otro segundo partido
              </Link>
            </>
          ) : (
            <ComparePicker match={match} />
          )}
        </section>
      )}
    </>
  );
  return (
    <article className="nc-wrap nc-match-page">
      <ArchiveBackLink />
      <details className="archive-provenance"><summary>Procedencia y actualización</summary><ArchiveFreshness manifest={await preparedManifest()}/><p>{match.context?.dateLabel==='Fecha del partido'?'Fecha exacta del encuentro documentada.':match.context?.date?'La fecha disponible identifica la edición; no acredita el día exacto del encuentro.':'No consta una fecha exacta del encuentro.'}</p><p>{match.context?.resultSource&&/^https?:\/\//.test(match.context.resultSource)?<a href={match.context.resultSource} rel="noopener noreferrer" target="_blank">Fuente del resultado <ArrowUpRight size={17} aria-hidden="true"/></a>:<Link href="/cobertura">Fuentes y metodología del archivo</Link>}</p>{match.context?.endDate&&<p>El encuentro terminó el {match.context.endDate}. La fecha principal indica el día de inicio.</p>}{!!match.context?.metadataSources?.length&&<ul>{match.context.metadataSources.map(item=><li key={item.field+item.url}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.field}: fuente contrastada <ArrowUpRight size={15} aria-hidden="true"/></a></li>)}</ul>}<p>La fecha del cálculo no equivale a una revisión manual de este resultado.</p></details>
      <Reading
        match={match}
        rivalry={rivalry}
        initial={initial}
        baseHref={`/match/${id}${junto ? `?junto=${encodeURIComponent(junto)}` : ""}`}
        around={around}
      />
    </article>
  );
}
