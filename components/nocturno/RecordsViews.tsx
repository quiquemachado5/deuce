import Link from "next/link";
import MatchRow from "./Row";
import PlayerAvatar from '@/components/PlayerAvatar';
import { number } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";
import { playerSlug } from "@/lib/explore";
import type { Era, RecordRow } from "@/lib/revista/records";
import { evidenceHref } from '@/lib/record-evidence';

export function recordValue(row: RecordRow, percent = false, asYear = false) {
  return row.display || (asYear ? String(row.value) : `${number(row.value, percent ? 1 : 0)}${percent ? " %" : ""}`);
}

export function RecordProof({ row }: { row: RecordRow }) {
  if (!row.proof) return null;
  const match = row.proof;
  return <div className="record-proof-score"><MatchRow match={match} /></div>;
}

export function RecordRanking({
  rows,
  offset = 0,
  percent = false,
  small = false,
  priorValue,
  asYear = false,
  evidence,
}: {
  rows: RecordRow[];
  offset?: number;
  percent?: boolean;
  small?: boolean;
  priorValue?: number;
  asYear?: boolean;
  evidence?: { id: string; filters: Record<string,string|undefined> };
}) {
  return (
    <div className={`rv-ranking-wrap${small ? " rv-ranking-wrap-small" : ""}${asYear ? " rv-ranking-wrap-year" : ""}`}>
    <div className="rd-ranking-columns" aria-hidden="true"><span>Pos.</span><span>Jugador o partido</span><span>Evidencia</span><span>{asYear ? "Año" : percent ? "Porcentaje" : "Cifra"}</span></div>
    <ol className={`rv-ranking${small ? " rv-ranking-small" : ""}`} start={offset + 1}>
      {rows.map((row, index) => {
        const prior = rows[index - 1];
        const place = (prior?.value ?? (index === 0 ? priorValue : undefined)) === row.value ? "=" : number(offset + index + 1);
        return (
          <li key={`${row.href}-${row.name}-${index}`}>
            <span className="rv-ranking-place">{place}</span>
            <div className="rv-ranking-person" data-has-avatar={row.href.startsWith('/players/') || undefined}>
                <Link href={row.href} className="rv-ranking-name">{row.href.startsWith('/players/') && <PlayerAvatar name={row.name} size={40} />}{row.name}</Link>
              <span className="rv-ranking-detail">{row.detail}</span>
            </div>
            <div className="rv-ranking-evidence">{evidence && !row.href.startsWith('/match/') ? (
                  <Link prefetch={false} className="rv-ranking-proof" href={evidenceHref(evidence.id, row, evidence.filters)} aria-label={`Ver partidos de ${row.name} en esta clasificación`}>Partidos</Link>
                ) : row.proof && row.href !== `/match/${row.proof.match_id}` ? (
                  <Link className="rv-ranking-proof" href={`/match/${row.proof.match_id}`} aria-label={`Ver un partido de ${row.name}`}>Partido</Link>
                ) : row.href.startsWith('/match/') ? <Link className="rv-ranking-proof" href={row.href} aria-label={`Ver partido: ${row.name}`}>Partido</Link> : null}</div>
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

export function RecordEras({ eras, cut = 2020, filters = {} }: { eras: Era[]; cut?: number; filters?: Record<string, string | undefined> }) {
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
          <Link className="dx-inline-link" href={'/records/evidencia?'+new URLSearchParams({...Object.fromEntries(Object.entries(filters).filter(([key,value])=>['year','surface','competition','era'].includes(key)&&value)) as Record<string,string>,dato:'dos-epocas',nombre:era.name,corte:String(cut)})}>Ver todas las finales de ambos periodos</Link>
        </article>
      ))}
    </div>
  );
}
