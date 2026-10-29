"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "@/app/records/records-index.module.css";

export type BoardRow = { name: string; playerHref: string; recordHref: string; value: number; display: string; detail: string };
export type BoardReading = {
  id: string; label: string; title: string; definition: string; minimum?: string;
  percent?: boolean; rows: BoardRow[]; photo?: { src: string; alt: string; objectPosition?: string };
};
export type BoardLink = { label: string; href: string; active: boolean };

const numeric = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export default function RecordsBoard({ reading, readings, cuts, years, selectedYear, seasonHref }: {
  reading: BoardReading; readings: BoardLink[]; cuts: BoardLink[]; years: number[]; selectedYear?: string; seasonHref: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const pageSize = 7;
  const leader = reading.rows[0];
  const rest = reading.rows.slice(1);
  const pages = Math.max(1, Math.ceil(rest.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = useMemo(() => rest.slice(safePage * pageSize, safePage * pageSize + pageSize), [rest, safePage]);
  const gap = leader && reading.rows[1] ? leader.value - reading.rows[1].value : 0;
  const gapText = leader && reading.rows[1]
    ? `+${numeric.format(gap)}${reading.percent ? " puntos" : ""} sobre ${reading.rows[1].name}`
    : "";

  return (
    <div className={styles.board}>
      <div className={styles.boardControls}>
        <div><span>Lectura</span><nav aria-label="Lectura del tablero">{readings.map((item) => <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</Link>)}</nav></div>
        <div><span>Corte</span><nav aria-label="Corte del tablero">{cuts.map((item) => <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</Link>)}</nav></div>
        <label className={styles.yearSelect}>Temporada<select value={selectedYear || ""} onChange={(event) => router.push(event.target.value ? `${seasonHref}${seasonHref.includes("?") ? "&" : "?"}year=${event.target.value}` : seasonHref)}><option value="">Todas</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      </div>
      <header className={styles.boardHead}>
        <div><p>Clasificación</p><h3>{reading.title}</h3><span>{reading.definition}</span>{reading.minimum && <small>{reading.minimum}</small>}</div>
        {gapText && <strong>{gapText}</strong>}
      </header>
      {!leader ? <p className={styles.empty}>En este corte no hay muestra bastante.</p> : (
        <div className={styles.boardGrid}>
          <Link href={leader.playerHref} className={styles.boardLeader}>
            {reading.photo && <Image src={reading.photo.src} alt={reading.photo.alt} fill priority sizes="(max-width: 760px) 100vw, 42vw" style={{ objectPosition: reading.photo.objectPosition || "50% 24%" }} />}
            <span><small>01</small><strong>{leader.name}</strong><b>{leader.display}</b><em>{leader.detail}</em></span>
          </Link>
          <div className={styles.boardList}>
            <ol start={safePage * pageSize + 2}>{visible.map((row, index) => <li key={`${row.name}-${row.recordHref}`}><span className={styles.rank}>{String(safePage * pageSize + index + 2).padStart(2, "0")}</span><Link href={row.playerHref}><strong>{row.name}</strong><small>{row.detail}</small></Link><Link href={row.recordHref} className={styles.rowValue}>{row.display}</Link></li>)}</ol>
            <nav className={styles.pagination} aria-label="Páginas del tablero"><button type="button" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button><span>{safePage + 1} / {pages}</span><button type="button" disabled={safePage === pages - 1} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></button></nav>
          </div>
        </div>
      )}
    </div>
  );
}
