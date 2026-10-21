import Link from "next/link";
import { number } from "@/lib/cuaderno/model";
import { evidenceHref } from "@/lib/record-evidence";
import type { RecordRow } from "@/lib/revista/records";
import { recordValue } from "./RecordsViews";

/** A compact comparison with one zero-based scale for every visible leader. */
export default function RecordBars({
  rows,
  id,
  percent,
  filters,
}: {
  rows: RecordRow[];
  id: string;
  percent?: boolean;
  filters: Record<string, string | undefined>;
}) {
  const leaders = rows.slice(0, 5).filter((row) => Number.isFinite(row.value) && row.value >= 0);
  if (leaders.length < 2) return null;
  const ceiling = percent ? 100 : Math.max(...leaders.map((row) => row.value));
  if (ceiling <= 0) return null;

  return (
    <section className="rv-bars" aria-labelledby="rv-bars-title">
      <div className="rv-bars-heading">
        <h2 id="rv-bars-title">Los cinco primeros</h2>
        <p>Escala común desde cero hasta {number(ceiling, percent ? 0 : 1)}{percent ? " %" : ""}.</p>
      </div>
      <ol>
        {leaders.map((row, index) => {
          const href = row.href.startsWith("/match/") ? row.href : evidenceHref(id, row, filters);
          return (
            <li key={`${row.href}-${row.name}-${index}`}>
              <Link href={href} prefetch={false} aria-label={`${row.name}: ${recordValue(row, percent)}${percent ? `, ${number(row.sample)} casos` : ""}. ${row.href.startsWith("/match/") ? "Ver partido" : "Ver partidos que sostienen esta cifra"}`}>
                <span className="rv-bars-name"><span>{number(index + 1)}</span>{row.name}</span>
                <span className="rv-bars-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, row.value / ceiling * 100))}%` }} /></span>
                <span className="rv-bars-result"><strong>{recordValue(row, percent)}</strong>{percent && <small>{number(row.sample)} casos</small>}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
