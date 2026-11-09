import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { preparedMatchContext } from "@/lib/revista/read-records";
import { ReadingHead } from "@/components/nocturno/Reading";
import ReadingLine from "@/components/nocturno/ReadingLine";
import ComparePicker from "@/components/nocturno/Compare";
import PanoramaMatch, { type PanoramaSection } from "@/components/PanoramaMatch";
import {
  neighboringMeetings,
  winnerName,
} from "@/lib/editorial";
import { tournamentName } from "@/lib/labels";
import { score } from "@/lib/cuaderno/model";
import { pairSlug, rivalryDirectory } from "@/lib/explore";
import Row from "@/components/nocturno/Row";
import { breadcrumbJsonLd, matchCanonicalPath, matchHasTransientState, matchJsonLd, noIndexFollow } from "@/lib/seo-metadata";
import { comparisonPageHref, findCircuitMatch, matchCircuit } from "@/lib/match-comparison";
import { StructuredData } from "@/components/StructuredData";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ junto?: string; vista?: string }>;
};

// The published snapshot already contains the validated match and its detail.
// Reading it first keeps cold navigations off the slower provider archive path.
const pageMatch = cache(async (id: string) => {
  return preparedMatchContext(id);
});

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { id } = await params,
    query = await searchParams,
    { match } = await pageMatch(id);
  if (!match) return { title: "Página no encontrada — DEUCE" };
  const title = `${match.player1.name} – ${match.player2.name} · ${score(match)} · ${tournamentName(match.tournament)} ${match.year} — DEUCE`,
    description = match.point_tape.length
      ? `Partido ${match.tour==='wta'?'WTA':'ATP'} con marcador, estadísticas disponibles y secuencia punto a punto publicada.`
      : match.statistics.length
        ? `Partido ${match.tour==='wta'?'WTA':'ATP'} con marcador y estadísticas publicadas; sin secuencia punto a punto.`
        : `Resultado ${match.tour==='wta'?'WTA':'ATP'} documentado con su marcador; sin estadísticas ni secuencia punto a punto publicadas.`,
    canonical = matchCanonicalPath(id);
  return {
    title,
    description: `${title.replace(" — DEUCE", "")}. ${description}`,
    alternates: { canonical, languages: { es: canonical, en: `/en/matches/${id}` } },
    openGraph: { title, description, images: [`/match/${id}/opengraph-image`], type: "article", url: canonical },
    twitter: { card: "summary_large_image", title, description, images: [`/match/${id}/opengraph-image`] },
    robots: matchHasTransientState(query) ? noIndexFollow : undefined,
  };
}

export default async function MatchPage({ params, searchParams }: Props) {
  const { id } = await params,
    { junto, vista } = await searchParams,
    { match, matches } = await pageMatch(id);
  if (!match) notFound();
  const pairMatches = matches.filter(
    (item) =>
      (item.player1.name === match.player1.name &&
        item.player2.name === match.player2.name) ||
      (item.player1.name === match.player2.name &&
        item.player2.name === match.player1.name),
  );
  if (!pairMatches.some((item) => item.match_id === match.match_id)) pairMatches.push(match);
  const rivalryNames = [match.player1.name, match.player2.name].sort((a, b) =>
      a.localeCompare(b, "es"),
    ) as [string, string],
    rivalry = rivalryDirectory(pairMatches)[0] || {
      names: rivalryNames,
      wins: rivalryNames.map((name) =>
        pairMatches.filter((item) => winnerName(item) === name).length,
      ) as [number, number],
      matches: pairMatches,
      slug: pairSlug(...rivalryNames),
    },
    neighbors = neighboringMeetings(matches, match),
    other =
      junto && junto !== "elige" && junto !== id
        ? findCircuitMatch(matches, junto, matchCircuit(match))
        : null,
    initial = (
      {
        resumen: "resumen",
        estadisticas: "estadisticas",
        medidas: "estadisticas",
        presion: "presion",
        "cara-a-cara": "cara-a-cara",
        alrededor: "cara-a-cara",
      } as Record<string, PanoramaSection>
    )[vista || ""] || (junto ? "cara-a-cara" : "resumen");
  const around = (
    <>
      {(neighbors.previous || neighbors.next) && (
        <div className="nc-match-around">
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
        </div>
      )}
      {!neighbors.previous && !neighbors.next && <p className="match-history-empty match-history-empty--standalone">No hay otros partidos registrados entre {match.tour==='wta'?'estas dos jugadoras':'estos dos jugadores'}.</p>}
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
              <Link href={comparisonPageHref(id, matchCircuit(match))}>
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
  return <>
    <StructuredData value={[
      matchJsonLd(match),
      breadcrumbJsonLd([
        { name: "Inicio", path: "/" },
        { name: "Partidos", path: `/partidos?tour=${matchCircuit(match)}` },
        { name: `${match.player1.name} – ${match.player2.name}`, path: matchCanonicalPath(id) },
      ]),
    ]} />
    <PanoramaMatch
      match={match}
      rivalry={rivalry}
      active={initial}
      supplemental={junto ? around : undefined}
    />
  </>;
}
