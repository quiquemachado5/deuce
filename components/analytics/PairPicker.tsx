"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pairSlug } from "@/lib/explore";
export default function PairPicker() {
  const router = useRouter(),
    [first, setFirst] = useState(""),
    [second, setSecond] = useState(""),
    [names, setNames] = useState<string[]>([]),
    [opponents, setOpponents] = useState<string[]>([]),
    [status, setStatus] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/rivals", { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => setNames(r.names))
      .catch((e) => {
        if (e.name !== "AbortError")
          setStatus(
            "No se pudo cargar el selector. Puedes usar la búsqueda de abajo.",
          );
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!first) return;
    const c = new AbortController();
    fetch(`/api/rivals?player=${encodeURIComponent(first)}`, {
      signal: c.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => setOpponents(r.names))
      .catch((e) => {
        if (e.name !== "AbortError")
          setStatus("No se pudieron cargar los rivales.");
      });
    return () => c.abort();
  }, [first]);
  return (
    <>
      <form
        className="nc-pair-picker"
        onSubmit={(e) => {
          e.preventDefault();
          if (opponents.includes(second))
            router.push(`/rivalries/${pairSlug(first, second)}`);
        }}
      >
        <label className="nc-field">
          <span>Primer jugador</span>
          <select
            value={first}
            onChange={(e) => {
              setFirst(e.target.value);
              setSecond("");
              setOpponents([]);
              setStatus("");
            }}
          >
            <option value="">Elegir jugador</option>
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="nc-field">
          <span>Su rival en el archivo</span>
          <select
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            disabled={!first}
          >
            <option value="">Elegir rival</option>
            {opponents.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button className="nc-button" disabled={!first || !second}>
          Comparar jugadores
        </button>
      </form>
      {status && (
        <p role="status" className="nc-meta">
          {status}
        </p>
      )}
    </>
  );
}
