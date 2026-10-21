import Link from "next/link";
import type { Match } from "@/lib/types";
import { tournamentName } from "@/lib/labels";
import { tournamentDirectory } from "@/lib/tournament-directory";
import { tournamentCourt } from "@/lib/tournament-presentation";
import Row from "./nocturno/Row";

/** Each page keeps its 25-match limit, with explicit edition boundaries. */
export default function EditionMatchGroups({ matches }: { matches: Match[] }) {
  const entries = tournamentDirectory(matches);
  const slugs = new Map(entries.map((entry) => [entry.name, entry.slug]));
  const groups = new Map<string, Match[]>();
  for (const match of matches) {
    const key = `${match.year}|${match.tournament}`;
    groups.set(key, [...(groups.get(key) || []), match]);
  }
  const years = [...new Set(matches.map((match) => match.year))].sort(
    (a, b) => b - a,
  );
  return (
    <div className="edition-match-groups">
      {years.map((year) => (
        <section
          className="match-year"
          key={year}
          aria-label={`Partidos de ${year}`}
        >
          <h3>{year}</h3>
          {[...groups]
            .filter(([, rows]) => rows[0].year === year)
            .map(([key, rows], index) => (
              <details
                className="match-edition"
                key={key}
                open={index === 0}
                data-event-surface={tournamentCourt(rows[0]).surface}
              >
                <summary>
                  <span>
                    <i
                      className={`nc-dot nc-dot-${tournamentCourt(rows[0]).surface}`}
                      aria-hidden="true"
                    />
                    {tournamentName(rows[0].tournament)}
                  </span>
                  <span className="match-edition-count">{rows.length}</span>
                </summary>
                <Link
                  className="match-edition-link"
                  href={`/${slugs.get(rows[0].tournament)}/${year}`}
                >
                  Ver la edición
                </Link>
                {rows.map((match) => (
                  <Row key={match.match_id} match={match} grouped />
                ))}
              </details>
            ))}
        </section>
      ))}
    </div>
  );
}
