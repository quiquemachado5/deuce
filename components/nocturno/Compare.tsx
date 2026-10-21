"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";

type Result = { href: string; name: string; detail?: string; group: string };
export default function ComparePicker({ match }: { match: Match }) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Result[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!query.trim()) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: abort.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw Error("search");
          const body = (await response.json()) as { items: Result[] };
          setResults(
            body.items
              .filter(
                (item) =>
                  item.group === "Partidos" &&
                  item.href !== `/match/${match.match_id}`,
              )
              .slice(0, 25),
          );
        })
        .catch((reason) => {
          if (reason.name !== "AbortError")
            setError("No se pudo abrir el archivo.");
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, match.match_id, attempt]);
  return (
    <div className="ry-compare-picker">
      <h2>Elige el segundo partido</h2>
      <p className="ry-data-note">
        {match.player1.name} contra {match.player2.name}
      </p>
      <label className="ry-compare-field">
        <span>Segundo partido</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setBusy(Boolean(event.target.value.trim()));
            setError("");
            setResults([]);
          }}
          placeholder="Buscar por jugador, torneo o año"
          type="search"
        />
      </label>
      {busy ? (
        <p role="status" className="ry-data-note">
          Buscando partidos…
        </p>
      ) : null}
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </p>
      ) : null}
      {!busy && !error && query.trim() && !results.length ? (
        <p>
          Nada con ese nombre en el archivo.{" "}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            Limpiar
          </button>
        </p>
      ) : null}
      <div className="ry-compare-results">
        {results.map((item) => (
          <Link
            key={item.href}
            href={`/match/${match.match_id}?junto=${encodeURIComponent(item.href.split("/").pop() || "")}&vista=alrededor#comparar`}
          >
            <span>{item.name}</span>
            {item.detail && <span className="ry-data-note">{item.detail}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
