import Image from "next/image";
import Link from "next/link";
import { playerPhoto } from "@/lib/player-imagery";
import { playerSlug } from "@/lib/explore";
import MatchRow from "./Row";
import { number } from "@/lib/cuaderno/model";
import type { Match } from "@/lib/types";
import type { RecordPiece, RecordRow, Era } from "@/lib/revista/records";
import { imageFocus } from "@/lib/image-focus";
export function Portrait({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
  fallback?: boolean;
}) {
  const p = playerPhoto(name);
  if (!p) return null;
  return (
    <figure className="nc-portrait">
      <Image
        className="art-directed-photo"
        src={p.src}
        alt={name}
        width={640}
        height={732}
        sizes="(max-width:759px) calc(100vw - 40px), 280px"
        style={imageFocus(p.objectPosition||'center top',p.mobileObjectPosition||p.objectPosition||'center top')}
        priority={large}
      />
    </figure>
  );
}
export function RankingRows({
  rows,
  percent = false,
  small = false,
  offset = 0,
  maxValue,
}: {
  rows: RecordRow[];
  percent?: boolean;
  small?: boolean;
  offset?: number;
  maxValue?: number;
}) {
  void maxValue;
  return (
    <ol
      className={`nc-ranking${small ? " nc-ranking-small" : ""}`}
      start={offset + 1}
    >
      {rows.map((row, i) => (
        <li key={`${row.name}-${row.detail}-${i}`}>
          <Link
            href={row.href}
            className="nc-ranking-row"
            title={`${row.name} · ${row.detail}`}
          >
            <span className="nc-rank-position">
              {i > 0 && rows[i - 1].value === row.value
                ? "="
                : number(offset + i + 1)}
            </span>
            <span className="nc-rank-person">
              <span className="nc-rank-name">{row.name}</span>
              <span className="nc-rank-detail">{row.detail}</span>
            </span>
            <span
              className={`nc-rank-value${percent && row.sample < 50 ? " nc-limited-value" : ""}`}
            >
              {row.display ||
                `${number(row.value, percent ? 1 : 0)}${percent ? " %" : ""}`}
              {percent && (
                <span className="nc-sample">{number(row.sample)} casos</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
export function ListPiece({
  piece,
  limit = 5,
  heading = "h2",
}: {
  piece: RecordPiece;
  limit?: number;
  photo?: boolean;
  heading?: "h1" | "h2";
}) {
  const eligible = piece.rows.filter((r) => !piece.percent || r.sample >= 50),
    rows = (eligible.length ? eligible : piece.rows).slice(0, limit),
    small = !!piece.percent && !eligible.length,
    Heading = heading;
  return (
    <section className="nc-list-piece">
      <Heading>
        <Link href={`/records?dato=${piece.id}`}>{piece.title}</Link>
      </Heading>
      <p className="nc-meta">
        {piece.years} · Solo este archivo · Mínimo {piece.minimum}{" "}
        {piece.id === "finales-ganadas"
          ? "finales"
          : piece.minimum === 1
            ? "caso"
            : "casos"}
        .
      </p>
      {small && (
        <p className="nc-meta">Muestras pequeñas · menos de 50 casos</p>
      )}
      <RankingRows rows={rows} percent={piece.percent} small={small} />
    </section>
  );
}
export function Proof({ match }: { match: Match }) { return <MatchRow match={match}/>; }
export function Curiosity({
  text,
  match,
  hero = false,
}: {
  text: string;
  match: Match;
  hero?: boolean;
  photoName?: string;
}) {
  if (text.length > 280) return null;
  return (
    <section className="nc-curiosity">
      {hero ? <h1>¿Sabías que…?</h1> : <h2>¿Sabías que…?</h2>}
      <p>{text}</p>
      <Proof match={match} />
    </section>
  );
}
export function TwoEras({ era }: { era: Era }) {
  const small = era.before.played < 50 || era.after.played < 50;
  return (
    <section className="nc-eras">
      <h2>Efectividad en finales</h2>
      <p className="nc-era-person">
        <Link href={`/jugadores/${playerSlug(era.name)}`}>{era.name}</Link>
      </p>
      <div className={`nc-era-pair${small ? " nc-era-small" : ""}`}>
        {[era.before, era.after].map((p, i) => (
          <div key={i}>
            <p className="nc-meta">
              {p.from}–{p.to}
            </p>
            <p className="nc-era-value">
              {number((p.won / p.played) * 100, 1)} %
            </p>
            <p>
              {p.won}–{p.played - p.won}{" "}
              <span className="nc-meta">· {p.played} finales</span>
            </p>
          </div>
        ))}
      </div>
      <p className="nc-meta">
        Mínimo 5 finales por tramo.
        {small
          ? " Muestras pequeñas: uno o ambos tramos tienen menos de 50 finales."
          : ""}
      </p>
      <Link className="nc-link" href={`/match/${era.proof.match_id}`}>
        La última final de la comparación
      </Link>
    </section>
  );
}
export function FirstRecorded({
  name,
  year,
  match,
}: {
  name: string;
  year: number;
  match: Match;
}) {
  return (
    <section className="nc-curiosity">
      <h2>El primero en este archivo</h2>
      <p>
        {name} · {year}
      </p>
      <Proof match={match} />
    </section>
  );
}
