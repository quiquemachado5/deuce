import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import type { Match } from "@/lib/types";
import { playerPhoto } from "@/lib/player-imagery";
import { courtPhoto } from "@/lib/imagery";
import { tournamentDirectory } from "@/lib/tournament-directory";
import { tournamentName } from "@/lib/labels";
import { tournamentCourt } from "@/lib/tournament-presentation";
import { playerSlug } from "@/lib/explore";
import { avatarPhotoStyle } from "@/lib/photo-style";
import {
  round,
  score,
  sentence,
  surfaceLabel,
} from "@/lib/cuaderno/model";
import Share from "@/components/nocturno/Share";
import HomeFinalScore from "@/components/HomeFinalScore";
import SetScoreboard from "@/components/SetScoreboard";

export default function MatchHero({
  match,
  reduced = false,
}: {
  match: Match;
  reduced?: boolean;
}) {
  const names = [match.player1.name, match.player2.name];
  const court = tournamentCourt({ ...match, indoor: match.context?.indoor });
  const event = tournamentDirectory([match])[0];
  const venue = courtPhoto(match.tournament);
  const result = match.quality?.result !== "review";
  const candidate = result ? sentence(match) : "";
  const sample = candidate.match(/\bde (\d+) (?:juegos|bolas)/);
  const insight = sample && Number(sample[1]) < 3 ? "" : candidate;
  const noPortraits = names.every((name) => !playerPhoto(name));
  if (reduced)
    return (
      <header className="match-mini" data-event-surface={match.surface}>
        <h2>
          {tournamentName(match.tournament)} · {match.year}
        </h2>
        <HomeFinalScore match={match} context="partido" />
      </header>
    );
  return (
    <header
      className={`match-hero${venue ? "" : " match-hero-no-venue"}${noPortraits ? " match-hero-no-portraits" : ""}`}
      data-event-surface={court.surface}
    >
      <div
        className={`match-hero-scene${venue ? "" : " match-hero-scene-plain"}`}
      >
        {venue && (
          <Image
            src={venue.src}
            alt={venue.alt}
            fill
            priority
            sizes="(max-width:759px) 100vw, 1200px"
          />
        )}
        <div className="match-hero-event">
          <Link href={event ? `/${event.slug}/${match.year}` : "/tournaments"}>
            {tournamentName(match.tournament)}
          </Link>
          <span>
            {match.year} · {round(match)}{" "}
            <i
              className={`nc-dot nc-dot-${court.surface}`}
              aria-hidden="true"
            />
            {surfaceLabel[court.surface]}
            {court.indoor === true ? " · Cubierta" : ""}
          </span>
        </div>
        <div className="match-hero-actions">
          <Link
            href={`/match/${match.match_id}?vista=alrededor#registro`}
            className="match-record-info"
            aria-label="Ver información y cobertura de este partido"
          >
            <Info size={18} aria-hidden="true" />
          </Link>
          <Share match={match} />
        </div>
      </div>
      <h1 className="nc-sr">
        {names.join(" contra ")} · {score(match)}
      </h1>
      <div className="match-hero-players">
        {names.map((name, index) => {
          const portrait = playerPhoto(name);
          return (
            <div
              key={name}
              className={`match-contender match-contender-${index + 1}${portrait ? "" : " match-contender-no-photo"}`}
            >
              {portrait && (
                <Link
                  className="match-contender-photo"
                  href={`/players/${playerSlug(name)}`}
                  aria-label={`Perfil de ${name}`}
                >
                  <Image
                    src={portrait.avatarCrop ? portrait.src : portrait.thumbnail || portrait.src}
                    alt={portrait.alt}
                    fill
                    sizes={
                      portrait.avatarCrop
                        ? "(max-width:759px) 320px, 640px"
                        : "(max-width:759px) 88px, 160px"
                    }
                    priority
                    style={avatarPhotoStyle(portrait)}
                  />
                </Link>
              )}
              <Link
                className="match-contender-name"
                data-winner={result && match.winner === index + 1}
                href={`/players/${playerSlug(name)}`}
              >
                {name}
              </Link>
              {result && match.winner === index + 1 && (
                <span className="nc-sr">Ganador</span>
              )}
            </div>
          );
        })}
        <div
          className="match-total"
          aria-label={`Sets: ${names[0]} ${match.score_summary.games.filter((set) => set[0] > set[1]).length}, ${names[1]} ${match.score_summary.games.filter((set) => set[1] > set[0]).length}`}
        >
          <strong>
            {match.score_summary.games.filter((set) => set[0] > set[1]).length}
            <span>–</span>
            {match.score_summary.games.filter((set) => set[1] > set[0]).length}
          </strong>
          <span>
            {!result
              ? "En revisión"
              : match.status === "Finished"
                ? "Finalizado"
                : /retir|aband/i.test(match.status)
                  ? "Abandono"
                  : "En revisión"}
          </span>
        </div>
      </div>
      <div className="match-setboard"><SetScoreboard match={match} /></div>
      {insight && insight.length <= 90 && (
        <div className="match-hero-bottom">
          {insight && insight.length <= 90 && <p>{insight}</p>}
        </div>
      )}
    </header>
  );
}
