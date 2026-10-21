import Link from "next/link";
import { number, round, score } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
import { playerSlug } from "@/lib/explore";
import type { Era, RecordRow } from "@/lib/revista/records";

export function recordValue(row: RecordRow, percent = false, asYear = false) {
  return row.display || (asYear ? String(row.value) : `${number(row.value, percent ? 1 : 0)}${percent ? " %" : ""}`);
}

export function RecordProof({ row }: { row: RecordRow }) {
  if (!row.proof) return null;
  const match = row.proof;
  return (
    <Link className="rv-proof" href={`/match/${match.match_id}`}>
      <strong>
        {tournamentName(match.tournament)} · {match.year} · {round(match)}
      </strong>
      <span>{match.player1.name} contra {match.player2.name}</span>
      <span>{score(match)}</span>
    </Link>
  );
}

export function RecordRanking({
  rows,
  offset = 0,
  percent = false,
  small = false,
  priorValue,
  asYear = false,
}: {
  rows: RecordRow[];
  offset?: number;
  percent?: boolean;
  small?: boolean;
  priorValue?: number;
  asYear?: boolean;
}) {
  return (
    <div className={`rv-ranking-wrap${small ? " rv-ranking-wrap-small" : ""}${asYear ? " rv-ranking-wrap-year" : ""}`}>
    <ol className={`rv-ranking${small ? " rv-ranking-small" : ""}`} start={offset + 1}>
      {rows.map((row, index) => {
        const prior = rows[index - 1];
        const place = (prior?.value ?? (index === 0 ? priorValue : undefined)) === row.value ? "=" : number(offset + index + 1);
        return (
          <li key={`${row.href}-${row.name}-${index}`}>
            <span className="rv-ranking-place">{place}</span>
            <div className="rv-ranking-person">
              <Link href={row.href} className="rv-ranking-name">{row.name}</Link>
              <span className="rv-ranking-detail">{row.detail}</span>
              {row.proof && row.href !== `/match/${row.proof.match_id}` && (
                <Link className="rv-ranking-proof" href={`/match/${row.proof.match_id}`}>
                  Ver partido
                </Link>
              )}
            </div>
            <div className="rv-ranking-result">
              <span className="rv-ranking-number"><strong>{recordValue(row, percent, asYear)}</strong>
                {percent && <small>{number(row.sample)} casos</small>}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
    </div>
  );
}

export function RecordEras({ eras }: { eras: Era[] }) {
  return (
    <div className="rv-eras-list">
      {eras.map((era) => (
        <article className="rv-era" key={era.name}>
          <div className="rv-era-head">
            <h2><Link href={`/players/${playerSlug(era.name)}`}>{era.name}</Link></h2>
            <Link href={`/match/${era.proof.match_id}`}>{tournamentName(era.proof.tournament)} {era.proof.year}</Link>
          </div>
          <div className="rv-era-values">
            {[era.before, era.after].map((period) => {
              const percent = (period.won / period.played) * 100;
              return (
                <div className="rv-era-period" key={`${period.from}-${period.to}`}>
                  <span>{period.from}–{period.to}</span>
                  <strong>{number(percent, 1)} %</strong>
                  <small>{number(period.won)}–{number(period.played - period.won)} · {number(period.played)} finales</small>
                  <span className="rv-era-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
