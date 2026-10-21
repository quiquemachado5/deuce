"use client";

import { useState } from "react";
import type { Match } from "@/lib/types";
import { matchStory } from "@/lib/match-story";
import { score } from "@/lib/cuaderno/model";
import ScoreText from "@/components/ScoreText";

export default function ReadingLine({ match }: { match: Match }) {
  const sets = matchStory(match);
  const names = [match.player1.name, match.player2.name];
  const scores = score(match).split(", ");
  const [selected, setSelected] = useState(0);
  const [selectedGame, setSelectedGame] = useState<number | null>(null);
  const current = sets[selected] || sets[0];

  if (!current?.games.length || match.status !== "Finished" || match.quality?.result === "review") {
    return null;
  }

  const totalGames = current.score[0] + current.score[1];
  const featuredGame = current.games.findIndex((game) => game.isBreak && game.winner);
  const firstKnownGame = current.games.findIndex((game) => game.winner);
  const activeGameIndex = selectedGame ?? (featuredGame >= 0 ? featuredGame : firstKnownGame);
  const activeGame = activeGameIndex >= 0 ? current.games[activeGameIndex] : null;

  return (
    <section className="ds-match-story" aria-label="El partido, set a set">
      <div className="ry-section-heading">
        <h2>Set a set</h2>
        <span>{sets.length} sets · {sets.reduce((count, set) => count + set.games.length, 0)} juegos</span>
      </div>

      <div
        className="ds-set-picker"
        role="group"
        aria-label="Seleccionar set"
        style={{ gridTemplateColumns: `repeat(${sets.length}, minmax(0, 1fr))` }}
      >
        {sets.map((set, index) => (
          <button
            key={set.set}
            type="button"
            aria-pressed={index === selected}
            aria-label={`Set ${set.set}: ${scores[index] || set.score.join("–")}. Ganó ${names[set.winner - 1]}`}
            onClick={() => {
              setSelected(index);
              setSelectedGame(null);
            }}
          >
            <span>Set {set.set}</span>
            <ScoreText value={scores[index] || set.score.join("–")} />
          </button>
        ))}
      </div>

      <div className="ds-set-summary">
        <strong>{names[current.winner - 1]} ganó el set</strong>
      </div>

      <div
        className="ds-set-balance"
        role="img"
        aria-label={`${names[0]}: ${current.score[0]} juegos. ${names[1]}: ${current.score[1]} juegos.`}
      >
        <span style={{ width: `${(current.score[0] / totalGames) * 100}%` }} />
        <span style={{ width: `${(current.score[1] / totalGames) * 100}%` }} />
      </div>
      <div className="ds-story-legend" aria-hidden="true">
        <span><i />{names[0]} · {current.score[0]}</span>
        <span><i />{names[1]} · {current.score[1]}</span>
      </div>

      {current.known > 0 ? (
        <>
          <div className="ds-game-sequence" role="group" aria-label={`Juegos registrados del set ${current.set}`}>
            {current.games.map((game, index) => (
              <button
                type="button"
                key={game.number}
                className={`ds-game-chip ds-game-side-${game.winner || "unknown"}${game.isBreak ? " ds-game-break" : ""}`}
                aria-pressed={activeGameIndex === index}
                aria-label={`Juego ${game.number}: ${game.winner ? `ganó ${names[game.winner - 1]}` : "secuencia incompleta"}${game.isBreak ? ", break" : ""}${game.tiebreak ? ", tie-break" : ""}`}
                onClick={() => setSelectedGame(index)}
              >
                {game.tiebreak ? "TB" : game.number}
                {game.isBreak && <span className="ds-break-label" aria-hidden="true">break</span>}
              </button>
            ))}
          </div>
          {activeGame && (
            <p className="ds-game-detail" aria-live="polite">
              Juego {activeGame.number} · {activeGame.winner
                ? `${names[activeGame.winner - 1]} ganó ${activeGame.isBreak ? "al resto" : activeGame.tiebreak ? "el tie-break" : "el juego"}.`
                : "Secuencia incompleta."}
            </p>
          )}
          {current.known < current.games.length && (
            <p className="ry-data-note">{current.known} de {current.games.length} juegos registrados.</p>
          )}
        </>
      ) : (
        <p className="ds-game-detail">Solo se conserva el marcador de este set.</p>
      )}
    </section>
  );
}
