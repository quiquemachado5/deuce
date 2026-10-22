import type { Match, Point } from "../types";
import { completeGames, recordedTiebreaks } from "../point-integrity";
import { analyzePointTape } from "../analytics/engine";
import {
  statFraction,
  statNumber,
  matchStat,
  isDeciding,
} from "../archive-insights";
import { roundPosition } from "../editorial";
export const description =
  "Grand Slams y Masters, leídos por el dato.";
export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: digits,
    useGrouping: "always",
  }).format(value);
export const score = (match: Match) =>
  match.final_score
    .replace(/[–-]/g, "–")
    .trim()
    .split(/[\s,]+/)
    .join(", ");
export { surfaceLabel } from '../surface';
export function round(match: Match) {
  const p = roundPosition(match.round);
  if (p >= 4)
    return (
      { 4: "Octavos", 5: "Cuartos", 6: "Semifinal", 7: "Final" } as Record<
        number,
        string
      >
    )[p];
  const n = match.round.match(/(?:round of |r)(128|64|32)/i);
  return n
    ? `Ronda de ${n[1]}`
    : ({ 1: "Primera ronda", 2: "Segunda ronda", 3: "Tercera ronda" } as Record<number, string>)[
        p
      ] || match.round;
}
export const tapeState = (m: Match) =>
  m.quality?.tape === "partial"
    ? "Secuencia incompleta"
    : m.point_tape.length
      ? "Con puntos"
      : "Solo marcador";
export function pressure(m: Match) {
  const games = completeGames(m.point_tape),
    points = games.flat(),
    report = analyzePointTape(points);
  return ([1, 2] as const).map((side) => {
    const thirty =
      side === 1
        ? report.pressure.thirtyAll.first
        : report.pressure.thirtyAll.second;
    const breaks = points.filter(
      (p) => p.is_break_point && p.server && p.server !== side,
    );
    const faced = points.filter((p) => p.is_break_point && p.server === side);
    const mp = points.filter(
      (p) =>
        p.is_match_point && p.match_point_for && p.match_point_for !== side,
    );
    const closing = points.filter(
      (p) => p.is_match_point && p.match_point_for === side,
    );
    return {
      side,
      thirty: [thirty.gamesWonAfterLever, thirty.leverWon],
      converted: statFraction(m, side, "Break points converted") || [
        breaks.filter((p) => p.winner === side).length,
        breaks.length,
      ],
      saved: statFraction(m, side, "Break points saved") || [
        faced.filter((p) => p.winner === side).length,
        faced.length,
      ],
      matchPoints: mp.length
        ? [mp.filter((p) => p.winner === side).length, mp.length]
        : [closing.filter((p) => p.winner === side).length, closing.length],
      matchLabel: mp.length
        ? "Bolas de partido salvadas"
        : "Bolas de partido ganadas",
    };
  });
}
export function sentence(m: Match) {
  if(m.winner && m.score_summary.games.length){
    const side=m.winner-1, name=side===0?m.player1.name:m.player2.name;
    const first=m.score_summary.games[0],second=m.score_summary.games[1];
    if(first[side]<first[1-side]){
      const two=second&&second[side]<second[1-side];
      return `${name} remontó ${two?'dos sets':'el primer set'} en ${round(m).toLowerCase()}.`;
    }
  }
  if (!m.point_tape.length) return "";
  const data = pressure(m),
    strongest = [...data]
      .filter((r) => r.thirty[1] > 0)
      .sort((a, b) => Number(b.side===m.winner)-Number(a.side===m.winner) || b.thirty[1] - a.thirty[1])[0];
  if (strongest) {
    const name = strongest.side === 1 ? m.player1.name : m.player2.name;
    return `${name} ganó ${strongest.thirty[0]} de ${strongest.thirty[1]} juegos tras ganar el 30–30.`;
  }
  const p = data.find((r) => r.converted[1] > 0);
  return p
    ? `${p.side === 1 ? m.player1.name : m.player2.name} convirtió ${p.converted[0]} de ${p.converted[1]} bolas de break.`
    : "";
}
export function kind(m: Match): string | null {
  const sets = m.score_summary.games,
    side = m.winner === 2 ? 1 : 0;
  if (!m.winner || !sets.length) return null;
  if (sets[0][side] < sets[0][1 - side]) return "Remontada";
  if (
    sets.length === 5 ||
    sets.some(
      (s) =>
        Math.max(...s) >= 10 &&
        Math.min(...s) <= Math.max(...s) - 2 &&
        Math.min(...s) < 6,
    )
  )
    return "Al límite";
  const gs = completeGames(m.point_tape).filter((g) => g[0].game !== 13),
    breaks = gs.filter(
      (g) => g.at(-1)!.server && g.at(-1)!.winner !== g.at(-1)!.server,
    ).length;
  const measured = ([1, 2] as const).map((s) =>
    statFraction(m, s, "Break points converted"),
  );
  if (
    breaks >= 4 ||
    (measured.every(Boolean) &&
      measured.reduce((sum, p) => sum + (p?.[0] || 0), 0) >= 4)
  )
    return "Roto";
  if (sets.some((s) => Math.max(...s) === 6 && Math.min(...s) <= 1))
    return "Manguito";
  const holds = ([1, 2] as const).map(
    (s) =>
      statFraction(m, s, "Service games won") ||
      (m.quality?.tape === "reliable"
        ? [
            gs.filter((g) => g[0].server === s && g.at(-1)!.winner === s)
              .length,
            gs.filter((g) => g[0].server === s).length,
          ]
        : null),
  );
  if (
    sets.some((s) => Math.max(...s) === 7 && Math.min(...s) === 6) &&
    holds.every((h) => h && h[1] > 0 && h[0] / h[1] > 0.85)
  )
    return "Cerrado";
  return null;
}
export function closeness(m: Match) {
  const sets = m.score_summary.games;
  if (!sets.length) return 0;
  const average =
    sets.reduce((sum, [a, b]) => sum + Math.min(a, b) / (a + b), 0) /
    sets.length;
  return Math.round(Math.min(100, average * 180 + (isDeciding(m) ? 10 : 0)));
}
export const formula =
  "90 %: proporción media de juegos del perdedor de cada set, normalizada sobre 50 %. 10 puntos si hubo set decisivo. No mide importancia histórica ni ronda.";
export type ReadingEvent = {
  point: Point;
  difference: number;
  x: number;
  label: string;
  type: "break" | "thirty" | "match";
  count: string;
};
export function lineData(m: Match) {
  const groups = completeGames(m.point_tape),
    verifiedPoints = groups.flat();
  const segments: { x: number; y: number }[][] = [],
    events: ReadingEvent[] = [];
  const unpositioned: { set: number; game: number; winner: 1 | 2 }[] = [];
  const names = [m.player1.name, m.player2.name];
  let offset = 0,
    position = 0;
  for (let s = 0; s < m.score_summary.games.length; s++) {
    const [a, b] = m.score_summary.games[s],
      total = a + b;
    const games = new Map(
      groups.filter((g) => g[0].set === s + 1).map((g) => [g[0].game, g]),
    );
    const boundaries = new Map<number, [number, number]>([
      [0, [0, 0]],
      [total, [a, b]],
    ]);
    let contradiction = false;
    const anchor = (index: number, value: [number, number]) => {
      const existing = boundaries.get(index);
      if (
        value[0] < 0 ||
        value[1] < 0 ||
        value[0] > a ||
        value[1] > b ||
        (existing && (existing[0] !== value[0] || existing[1] !== value[1]))
      ) {
        contradiction = true;
        return;
      }
      boundaries.set(index, value);
    };
    // Anchor only connected prefixes and suffixes. A missing winner stays a gap.
    let forward: [number, number] = [0, 0];
    for (let g = 1; g <= total; g++) {
      const winner = games.get(g)?.at(-1)?.winner;
      if (!winner) break;
      forward = [...forward];
      forward[winner - 1]++;
      anchor(g, forward);
    }
    let backward: [number, number] = [a, b];
    for (let g = total; g >= 1; g--) {
      const winner = games.get(g)?.at(-1)?.winner;
      if (!winner) break;
      backward = [...backward];
      backward[winner - 1]--;
      anchor(g - 1, backward);
    }
    let segment: { x: number; y: number }[] = [];
    for (let g = 1; g <= total; g++) {
      const rows = games.get(g),
        before = boundaries.get(g - 1),
        after = boundaries.get(g);
      if (!rows || !before || !after || contradiction) {
        if (segment.length > 1) segments.push(segment);
        segment = [];
        if (rows?.at(-1)?.winner)
          unpositioned.push({
            set: s + 1,
            game: g,
            winner: rows.at(-1)!.winner!,
          });
        continue;
      }
      const difference = offset + before[0] - before[1];
      if (!segment.length) segment.push({ x: position + g - 1, y: difference });
      rows.forEach((p, i) => {
        const type = p.is_match_point
          ? "match"
          : p.break_converted
            ? "break"
            : p.score_before?.replace("–", "-") === "30-30"
              ? "thirty"
              : null;
        if (!type) return;
        const who = p.winner ? names[p.winner - 1] : "";
        const subset = verifiedPoints.filter(
          (q) =>
            q.point_number <= p.point_number &&
            q.is_break_point &&
            q.server === p.server,
        );
        events.push({
          point: p,
          difference:
            difference + (p.game_ended ? (p.winner === 1 ? 1 : -1) : 0),
          x: position + g - 1 + (i + 1) / rows.length,
          type,
          label: `${type === "break" ? "Break de" : type === "match" ? "Bola de partido:" : "30–30:"} ${who}, set ${s + 1}, ${before.join("–")} en juegos`,
          count:
            type === "break"
              ? `${subset.filter((q) => q.break_converted).length} de ${subset.length}`
              : `${p.score_before?.replace(/-/g, "–") || ""}`,
        });
      });
      segment.push({ x: position + g, y: offset + after[0] - after[1] });
    }
    if (segment.length > 1) segments.push(segment);
    offset += a - b;
    position += total;
  }
  return {
    segments,
    events,
    unpositioned,
    total: position,
    extent: Math.max(2, ...segments.flat().map((p) => Math.abs(p.y))),
    tiebreaks: recordedTiebreaks(m),
  };
}
export const measuredFields = [
  "1st serve in",
  "1st serve points won",
  "2nd serve points won",
  "Aces",
  "Double Faults",
  "Service points won",
  "Return points won",
  "1st return points won",
  "2nd return points won",
  "Service games won",
  "Return games won",
  "Golpes ganadores",
  "Errores no forzados",
  "Ganadores de derecha",
  "Ganadores de revés",
  "Voleas ganadoras",
  "Restos ganadores",
  "Remates ganadores",
  "Dejadas ganadoras",
  "Globos ganadores",
  "Golpes de fondo ganadores",
  "Errores forzados",
  "Errores forzados de derecha",
  "Errores forzados de revés",
  "Errores forzados al resto",
  "Errores forzados en remates",
  "Errores forzados de fondo",
  "Errores no forzados de derecha",
  "Errores no forzados de revés",
  "Errores no forzados en volea",
  "Errores no forzados en dejadas",
  "Errores no forzados en globos",
  "Errores no forzados de fondo",
];
export function measuredValue(m: Match, side: 1 | 2, key: string) {
  const f = statFraction(m, side, key);
  if (f)
    return `${number((f[0] / f[1]) * 100)} % · ${number(f[0])} de ${number(f[1])}`;
  const v = statNumber(matchStat(m, side, key));
  return v === null ? null : number(v, 1);
}
