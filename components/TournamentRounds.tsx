"use client";

import { useId, useState, type ReactNode } from "react";

export default function TournamentRounds({ rounds, initialRound }: {
  rounds: { key: string; label: string; count: number; content: ReactNode }[];
  initialRound: string;
}) {
  const [selected, setSelected] = useState(initialRound);
  const id = useId();
  const chooseRound = (key: string) => {
    setSelected(key);
    if (window.matchMedia("(min-width: 1100px)").matches) {
      document.getElementById(`${id}-${key}`)?.scrollIntoView({
        block: "nearest", inline: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  };
  return <div className="td-round-browser">
    <div className="td-round-tabs" role="group" aria-label="Elegir ronda del cuadro">
      {rounds.map((round) => <button key={round.key} type="button" aria-pressed={selected === round.key}
        aria-controls={`${id}-${round.key}`} onClick={() => chooseRound(round.key)}>
        {round.label}<span>{round.count}</span>
      </button>)}
    </div>
    <div className="td-bracket-columns">
      {rounds.map((round) => <section className="td-bracket-round" key={round.key} data-active={selected === round.key}
        id={`${id}-${round.key}`} aria-label={round.label}>
        <h3>{round.label}<span>{round.count} {round.count === 1 ? "partido" : "partidos"}</span></h3>
        {round.content}
      </section>)}
    </div>
  </div>;
}
