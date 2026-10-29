"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./tournament-detail.module.css";

export default function TournamentChampionRail({ children, title, titleId }: { children: ReactNode; title: string; titleId: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [limits, setLimits] = useState({ start: true, end: false });
  const updateLimits = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    setLimits({
      start: node.scrollLeft <= 2,
      end: node.scrollLeft >= node.scrollWidth - node.clientWidth - 2,
    });
  }, []);
  useEffect(() => {
    updateLimits();
    window.addEventListener("resize", updateLimits);
    return () => window.removeEventListener("resize", updateLimits);
  }, [updateLimits]);
  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.72), behavior: reducedMotion ? "auto" : "smooth" });
  };
  return (
    <div className={styles.championRail}>
      <div className={styles.championRailToolbar}>
        <h2 id={titleId}>{title}</h2>
        <div className={styles.championRailControls} aria-label="Mover campeones">
        <button type="button" onClick={() => move(-1)} aria-label="Campeones anteriores" disabled={limits.start}><ChevronLeft size={19} aria-hidden="true" /></button>
        <button type="button" onClick={() => move(1)} aria-label="Campeones siguientes" disabled={limits.end}><ChevronRight size={19} aria-hidden="true" /></button>
        </div>
      </div>
      <div
        ref={viewport}
        className={styles.championRailViewport}
        role="region"
        aria-label="Campeones recientes"
        tabIndex={0}
        onScroll={updateLimits}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
      >
        <ol className={styles.championRailList}>{children}</ol>
      </div>
    </div>
  );
}
