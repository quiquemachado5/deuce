"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

export default function TournamentChampionRail({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const move = (direction: -1 | 1) => {
    const node = viewport.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.72), behavior: "smooth" });
  };
  return (
    <div className="td-champion-rail">
      <div className="td-rail-controls" aria-label="Mover campeones">
        <button type="button" onClick={() => move(-1)} aria-label="Campeones anteriores"><ChevronLeft size={19} aria-hidden="true" /></button>
        <button type="button" onClick={() => move(1)} aria-label="Campeones siguientes"><ChevronRight size={19} aria-hidden="true" /></button>
      </div>
      <div
        ref={viewport}
        className="td-rail-viewport"
        role="region"
        aria-label="Campeones recientes"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") move(-1);
          if (event.key === "ArrowRight") move(1);
        }}
      >
        <ol className="td-champions">{children}</ol>
      </div>
    </div>
  );
}
