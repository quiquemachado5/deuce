"use client";

import { useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { score, sentence, round } from "@/lib/cuaderno/model";
import { tournamentName } from "@/lib/labels";

export default function Share({ match }: { match: Match }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null),
    [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function download(width: number, height: number) {
    setBusy(true);
    setError("");
    try {
      await document.fonts.ready;
      const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
      if (!context) throw Error("canvas");
      canvas.width = width;
      canvas.height = height;
      const pad = width * .075, unit = Math.min(width, height), usable = width - pad * 2;
      const styles = getComputedStyle(trigger.current ?? document.documentElement);
      const color = (name: string) => styles.getPropertyValue(name).trim();
      const accent = color("--event-accent") || color("--court");
      context.fillStyle = color("--bg-raised");
      context.fillRect(0, 0, width, height);
      context.fillStyle = accent;
      context.font = `600 ${unit * .033}px system-ui, sans-serif`;
      context.fillText("DEUCE", pad, height * .115);
      const write = (text: string, top: number, size: number, weight = 500) => {
        context.font = `${weight} ${size}px system-ui, sans-serif`;
        let line = "", y = top;
        for (const word of text.split(" ")) {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > usable) {
            context.fillText(line, pad, y);
            y += size * 1.2;
            line = word;
          } else line = candidate;
        }
        context.fillText(line, pad, y);
        return y + size * 1.2;
      };
      context.fillStyle = color("--muted");
      write(`${tournamentName(match.tournament)} · ${match.year} · ${round(match)}`, height * .225, unit * .027);
      const names = [match.player1.name, match.player2.name];
      let top = height * .36;
      names.forEach((name) => {
        context.fillStyle = color("--ink");
        top = write(name, top, unit * .05, 600) + unit * .055;
      });
      context.fillStyle = accent;
      top = write(score(match), top + unit * .02, unit * .043, 600);
      if (match.winner && match.quality?.result !== "review") {
        context.fillStyle = color("--muted");
        top = write(`Ganador: ${names[match.winner - 1]}`, top + unit * .024, unit * .024);
      }
      const editorial = sentence(match);
      if (match.quality?.result !== "review" && editorial.length <= 90 && top + unit * .075 < height * .83) {
        context.fillStyle = color("--muted");
        write(editorial, top + unit * .025, unit * .024);
      }
      context.strokeStyle = color("--line-strong");
      context.beginPath();
      context.moveTo(pad, height * .87);
      context.lineTo(width - pad, height * .87);
      context.stroke();
      context.fillStyle = color("--muted");
      context.font = `400 ${unit * .018}px system-ui, sans-serif`;
      context.fillText(`deuce-archive.vercel.app/match/${match.match_id}`, pad, height * .925);
      const link = document.createElement("a");
      link.download = `deuce-${match.match_id}-${width}x${height}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setError("No se pudo crear la imagen. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return <>
    <button ref={trigger} type="button" className="ry-match-share" aria-label="Compartir partido" onClick={() => dialog.current?.showModal()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M6 12H4v9h16v-9h-2"/></svg><span>Compartir</span></button>
    <dialog ref={dialog} className="ry-share-dialog" aria-labelledby={`share-${match.match_id}`} onClose={() => trigger.current?.focus()} onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.current?.close();
    }}>
      <div className="ry-share-dialog-head"><h2 id={`share-${match.match_id}`}>Compartir partido</h2><button type="button" className="ry-match-icon" aria-label="Cerrar" onClick={() => dialog.current?.close()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <p className="ry-data-note">Descarga una tarjeta con el resultado del partido.</p>
      <div className="ry-share-preview"><p>{tournamentName(match.tournament)} · {match.year} · {round(match)}</p><div><span className="ry-player-1">{match.player1.name}</span><span className="ry-player-2">{match.player2.name}</span></div><strong>{score(match)}</strong>{match.winner && match.quality?.result !== "review" && <p>Ganador: {match.winner === 1 ? match.player1.name : match.player2.name}</p>}</div>
      <div className="ry-share-formats" aria-busy={busy}>{[{ label: "Cuadrado", size: "1080 × 1080", w: 1080, h: 1080 }, { label: "Horizontal", size: "1600 × 900", w: 1600, h: 900 }, { label: "Vertical", size: "1080 × 1920", w: 1080, h: 1920 }].map((format) => <button type="button" key={format.label} disabled={busy} onClick={() => download(format.w, format.h)}><span>{format.label}</span><small>{format.size}</small><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10m-4-4 4 4 4-4M4 14v3h12v-3"/></svg></button>)}</div>
      {busy && <p className="ry-data-note" role="status">Creando imagen…</p>}{error && <p role="alert" className="ry-match-review">{error}</p>}
    </dialog>
  </>;
}
