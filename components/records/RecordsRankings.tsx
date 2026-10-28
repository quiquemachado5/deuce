"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import RecordsAnimatedValue from "./RecordsAnimatedValue";

export type RecordsRankingSet = {
  id: string;
  title: string;
  shortTitle: string;
  rows: Array<{
    name: string;
    href: string;
    detail: string;
    value: number;
    display: string;
  }>;
  photo?: {
    src: string;
    alt: string;
    objectPosition?: string;
    mobileObjectPosition?: string;
  };
};

export default function RecordsRankings({ sets }: { sets: RecordsRankingSet[] }) {
  const [activeId, setActiveId] = useState(sets[0]?.id || "");
  const [page, setPage] = useState(0);
  const active = useMemo(
    () => sets.find((set) => set.id === activeId) || sets[0],
    [activeId, sets],
  );

  if (!active || !active.rows.length) return null;

  const leader = active.rows[0];
  const pageSize = 6;
  const rest = active.rows.slice(1);
  const pageCount = Math.max(1, Math.ceil(rest.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = rest.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  const chooseSet = (id: string) => {
    setActiveId(id);
    setPage(0);
  };

  return (
    <div className="records-leaderboard">
      <header className="records-leaderboard-head">
        <h2>Clasificaciones históricas</h2>
        <div
          className="records-leaderboard-switch"
          role="group"
          aria-label="Clasificación mostrada"
        >
          {sets.map((set) => (
            <button
              key={set.id}
              type="button"
              aria-pressed={set.id === active.id}
              onClick={() => chooseSet(set.id)}
            >
              {set.shortTitle}
            </button>
          ))}
        </div>
      </header>

      <div className="records-leaderboard-grid" key={active.id}>
        <Link className="records-ranking-leader" href={leader.href}>
          <span className="records-ranking-leader-photo">
            {active.photo ? (
              <Image
                className="records-ranking-photo-image"
                src={active.photo.src}
                alt={active.photo.alt}
                fill
                priority
                unoptimized
                sizes="(max-width: 560px) 112px, 184px"
                style={
                  {
                    "--record-photo-position":
                      active.photo.objectPosition || "50% 24%",
                    "--record-photo-position-mobile":
                      active.photo.mobileObjectPosition ||
                      active.photo.objectPosition ||
                      "50% 18%",
                  } as CSSProperties
                }
              />
            ) : (
              <PlayerAvatar name={leader.name} size={184} />
            )}
          </span>
          <span className="records-ranking-leader-copy">
            <strong>{leader.name}</strong>
            <b>
              <RecordsAnimatedValue value={leader.value} display={leader.display} />
            </b>
          </span>
        </Link>

        <div className="records-ranking-side">
          <ol className="records-ranking-rows" key={`${active.id}-${safePage}`}>
            {visibleRows.map((row, index) => {
              return (
              <li
                key={row.href}
                style={{ "--rank-index": index } as React.CSSProperties}
              >
                <PlayerAvatar name={row.name} size={46} />
                <Link href={row.href}>
                  <strong>{row.name}</strong>
                </Link>
                <b>{row.display}</b>
              </li>
              );
            })}
          </ol>
        </div>
      </div>
      <nav className="records-ranking-pagination" aria-label="Páginas de la clasificación">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={safePage === 0}
          aria-label="Página anterior"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <span aria-hidden="true">
          {Array.from({ length: pageCount }, (_, index) => (
            <i key={index} data-active={index === safePage || undefined} />
          ))}
        </span>
        <button
          type="button"
          onClick={() =>
            setPage((current) => Math.min(pageCount - 1, current + 1))
          }
          disabled={safePage === pageCount - 1}
          aria-label="Página siguiente"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
