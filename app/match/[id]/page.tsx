import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { preparedArchive } from "@/lib/revista/read-records";
import Reading, { ReadingHead } from "@/components/nocturno/Reading";
import ReadingLine from "@/components/nocturno/ReadingLine";
import ComparePicker from "@/components/nocturno/Compare";
import type { MatchView } from "@/components/nocturno/MatchTabs";
import {
  neighboringMeetings,
  roundPosition,
  winnerName,
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
  const match = matches.find((item) => item.match_id === id);
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
    openGraph: { title, description, images: [`/match/${id}/opengraph-image`] },
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
    winner = winnerName(match),
    path = matches
      .filter(
        (item) =>
          item.tournament === match.tournament &&
          item.year === match.year &&
          (item.player1.name === winner || item.player2.name === winner),
      )
      .sort((a, b) => roundPosition(a.round) - roundPosition(b.round)),
    index = path.findIndex((item) => item.match_id === id),
    previousRound = index >= 0 ? path[index - 1] : null,
    nextRound = index >= 0 ? path[index + 1] : null,
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
        {(previousRound || nextRound) && (
          <section>
            <h2>En esta edición</h2>
            {previousRound && (
              <div className="match-history-meeting">
                <span>Ronda anterior de {winner}</span>
                <Row match={previousRound} firstPlayer={winner || undefined} />
              </div>
            )}
            {nextRound && (
              <div className="match-history-meeting">
                <span>Ronda siguiente de {winner}</span>
                <Row match={nextRound} firstPlayer={winner || undefined} />
              </div>
            )}
          </section>
        )}
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
      <Link className="ry-match-back" href="/buscar">
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="m11.5 4.5-5.5 5.5 5.5 5.5M6.5 10H17" />
        </svg>
        Partidos
      </Link>
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
