"use client";

import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { useEffect, useId, useState } from "react";

type PairResult = {
  names: [string, string];
  wins: [number, number];
  played: number;
};

function PlayerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) return;
        const body = await response.json();
        setSuggestions((body.items || [])
          .filter((item: { group: string }) => item.group === "Jugadores")
          .map((item: { name: string }) => item.name)
          .slice(0, 10));
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) setSuggestions([]);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <label className="quick-h2h-field">
      <span>{label}</span>
      <input
        type="search"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe un nombre"
        autoComplete="off"
        maxLength={100}
      />
      <datalist id={listId}>{value.trim().length >= 2 ? suggestions.map((name) => <option value={name} key={name} />) : null}</datalist>
    </label>
  );
}

export default function QuickH2H() {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [lookup, setLookup] = useState<{ key: string; result: PairResult | null; status: string }>({ key: "", result: null, status: "" });
  const a = first.trim();
  const b = second.trim();
  const samePlayer = a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
  const ready = a.length >= 2 && b.length >= 2 && !samePlayer;
  const lookupKey = ready ? `${a}\u0000${b}` : "";

  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookup({ key: lookupKey, result: null, status: "Calculando el cara a cara…" });
      try {
        const response = await fetch(`/api/rivals?player=${encodeURIComponent(a)}&opponent=${encodeURIComponent(b)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("request");
        const body = await response.json();
        if (!body.pair) {
          setLookup({ key: lookupKey, result: null, status: "No hay enfrentamientos entre esos jugadores en el archivo." });
          return;
        }
        setLookup({ key: lookupKey, result: body.pair, status: "" });
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) setLookup({ key: lookupKey, result: null, status: "No se pudo calcular la comparación." });
      }
    }, 260);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [a, b, lookupKey, ready]);

  const result = lookup.key === lookupKey ? lookup.result : null;
  const status = a.length < 2 || b.length < 2
    ? "Elige dos jugadores del archivo."
    : samePlayer
      ? "Selecciona dos jugadores distintos."
      : lookup.key === lookupKey
        ? lookup.status
        : "Calculando el cara a cara…";

  const compareHref = result
    ? `/comparar?a=${encodeURIComponent(result.names[0])}&b=${encodeURIComponent(result.names[1])}&minimum=5`
    : "/comparar";
  const totalWins = result ? Math.max(1, result.wins[0] + result.wins[1]) : 1;

  return (
    <section className="quick-h2h" aria-labelledby="quick-h2h-title">
      <div className="ds-section-heading">
        <div><span className="quick-h2h-kicker"><Swords size={15} aria-hidden="true" /> Comparador rápido</span><h2 id="quick-h2h-title">Cara a cara en el archivo</h2></div>
        <Link href="/comparar">Comparador completo</Link>
      </div>
      <div className="quick-h2h-fields">
        <PlayerField label="Jugador 1" value={first} onChange={setFirst} />
        <span aria-hidden="true">VS</span>
        <PlayerField label="Jugador 2" value={second} onChange={setSecond} />
      </div>

      {result ? (
        <div className="quick-h2h-result" aria-live="polite">
          <div><span>{result.names[0]}</span><strong>{result.wins[0]}</strong></div>
          <p><strong>{result.played}</strong><span>partidos</span></p>
          <div><span>{result.names[1]}</span><strong>{result.wins[1]}</strong></div>
          <div className="quick-h2h-bar" aria-hidden="true"><i style={{ width: `${result.wins[0] / totalWins * 100}%` }} /><i style={{ width: `${result.wins[1] / totalWins * 100}%` }} /></div>
          <Link href={compareHref}>Ver comparación completa <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      ) : <p className="quick-h2h-status" role="status">{status}</p>}
    </section>
  );
}
