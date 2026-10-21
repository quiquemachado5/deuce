import { eligibleMatch } from "../quality";
import type { Match, Surface } from "../types";
import { TOURNAMENTS } from "../types";
import { buildSeasonAnalytics, rankingMetrics } from "../season-analytics";
import { playerSlug, rivalryDirectory } from "../explore";
import { chronological, winnerName, durationLabel } from "../editorial";
import { lostOpening, isDeciding, gamesInMatch, statFraction, matchStat, statNumber } from "../archive-insights";
import { number, score, closeness, formula } from "../cuaderno/model";
import { shelves, measuredKeys } from "../cuaderno/shelves";
import { analyzePointTape } from "../analytics/engine";
import { tournamentName } from "../labels";
import { yearExtent } from "./year-extent";
import { publishedMatchMinutes } from "../duration";
export const description =
  "Grand Slams, Masters y torneos ATP, leídos por el dato.";
export type RecordRow = {
  name: string;
  value: number;
  display?: string;
  detail: string;
  sample: number;
  href: string;
  photoName?: string;
  proof?: Match;
};
export type RecordPiece = {
  id: string;
  title: string;
  group: string;
  definition: string;
  minimum: number;
  percent?: boolean;
  measured?: boolean;
  rows: RecordRow[];
  sample: number;
  years: string;
};
export type Era = {
  name: string;
  before: { from: number; to: number; won: number; played: number };
  after: { from: number; to: number; won: number; played: number };
  proof: Match;
};
const final = (m: Match) => m.round.toLowerCase() === "final";
const years = (ms: Match[]) => {
  const extent = yearExtent(ms);
  return extent ? `${extent.first}–${extent.last}` : "";
};
const person = (
  name: string,
  value: number,
  sample: number,
  detail: string,
  proof?: Match,
): RecordRow => ({
  name,
  value,
  sample,
  detail,
  href: `/players/${playerSlug(name)}`,
  photoName: name,
  proof,
});
const matchRow = (m: Match, value: number, display?: string): RecordRow => ({
  name: `${m.player1.name} – ${m.player2.name}`,
  value,
  display,
  sample: 1,
  detail: `${tournamentName(m.tournament)} · ${m.year} · ${score(m)}`,
  href: `/match/${m.match_id}`,
  photoName: winnerName(m) || undefined,
  proof: m,
});
export const groupDescriptions: Record<string, string> = {
  "Títulos y finales": "Quién llegó al último partido y quién lo ganó.",
  Victorias: "Volumen, superficies y secuencias de resultados completos.",
  "Remontadas y forma del partido": "Cómo cambió el tanteo, set a set.",
  Presión: "Solo secuencias que cuadran con el resultado.",
  "Tiempo, edad y calendario":
    "Minutos, edades y fechas publicados por la fuente.",
  "Un torneo": "Títulos, finales y ediciones de cada campeonato.",
  Parejas: "Los enfrentamientos que se repiten en este archivo.",
  "Medidas de partido": "Solo partidos con este dato. No es todo el archivo.",
};
export function eraComparisons(
  matches: Match[],
  cut: number,
  name?: string,
): Era[] {
  const byName = new Map<string, Match[]>();
  for (const m of matches.filter((m) => eligibleMatch(m) && final(m)))
    for (const n of [m.player1.name, m.player2.name]) {
      if (name && n !== name) continue;
      const list = byName.get(n) || [];
      list.push(m);
      byName.set(n, list);
    }
  return [...byName]
    .flatMap(([name, list]) => {
      const a = list.filter((m) => m.year < cut),
        b = list.filter((m) => m.year >= cut);
      if (a.length < 5 || b.length < 5) return [];
      const summarize = (rows: Match[]) => {
        const extent = yearExtent(rows)!;
        return {
          from: extent.first,
          to: extent.last,
          won: rows.filter((m) => winnerName(m) === name).length,
          played: rows.length,
        };
      };
      return [
        {
          name,
          before: summarize(a),
          after: summarize(b),
          proof: [...b].sort(chronological).at(-1)!,
        },
      ];
    })
    .sort(
      (a, b) =>
        Math.abs(
          b.after.won / b.after.played - b.before.won / b.before.played,
        ) -
          Math.abs(
            a.after.won / a.after.played - a.before.won / a.before.played,
          ) || b.after.played - a.after.played,
    );
}
function grouped(
  matches: Match[],
  key: (m: Match, n: string) => string,
  both = false,
) {
  const map = new Map<string, { name: string; list: Match[] }>();
  for (const m of matches)
    for (const n of both ? [m.player1.name, m.player2.name] : [winnerName(m)]) {
      if (!n) continue;
      const label = key(m, n),
        v = map.get(label) || { name: n, list: [] };
      v.list.push(m);
      map.set(label, v);
    }
  return [...map].map(([label, { name, list }]) =>
    person(
      name,
      list.length,
      list.length,
      label.replace(`${name} · `, ""),
      [...list].sort(chronological).at(-1),
    ),
  );
}
const cache = new WeakMap<Match[], RecordPiece[]>();
export function recordCatalog(matches: Match[]): RecordPiece[] {
  const cached = cache.get(matches);
  if (cached) return cached;
  const cacheKey = matches;
  matches = matches.filter(eligibleMatch);
  const records = buildSeasonAnalytics(matches).players,
    reliable = matches.filter((m) => m.quality?.tape === "reliable"),
    prs = buildSeasonAnalytics(reliable).players,
    finals = matches.filter((m) => eligibleMatch(m) && final(m)),
    result: RecordPiece[] = [];
  const add = (
    id: string,
    title: string,
    group: string,
    definition: string,
    rows: RecordRow[],
    min = 1,
    percent = false,
    source = matches,
    measured = false,
    asc = false,
  ) => {
    rows = rows
      .filter(
        (r) =>
          Number.isFinite(r.value) &&
          r.sample >= min &&
          (percent || r.value > 0),
      )
      .sort(
        (a, b) =>
          (asc ? a.value - b.value : b.value - a.value) ||
          b.sample - a.sample ||
          a.name.localeCompare(b.name, "es"),
      );
    if (rows.length)
      result.push({
        id,
        title,
        group,
        definition,
        minimum: min,
        percent,
        measured,
        rows,
        sample: source.length,
        years: years(source),
      });
  };
  const metric = (
    id: string,
    title: string,
    group: string,
    key: string,
    min = 1,
    pressure = false,
  ) => {
    const def = rankingMetrics.find((m) => m.key === key);
    if (!def) return;
    const opponentRankLimit =
      key === "top10-wins" ? 10 :
      key === "top5-wins" ? 5 :
      key === "number-one-wins" ? 1 : null;
    const source = (pressure ? reliable : matches).filter((m) => {
      if (key === "finals-played") return final(m);
      if (opponentRankLimit !== null)
        return (
          !!m.context?.rankLabel &&
          !/descarga/i.test(m.context.rankLabel) &&
          [m.context.rank1, m.context.rank2].some((r) => r && r > 0 && r <= opponentRankLimit)
        );
      if (
        key.endsWith("-wins") &&
        ["hard", "clay", "grass"].includes(key.split("-")[0])
      )
        return m.surface === key.split("-")[0];
      if (key === "first-set-comebacks") return lostOpening(m);
      if (key === "two-set-comebacks") return lostOpening(m, 2);
      if (key === "five-set-wins" || key === "five-set-rate")
        return m.score_summary.games.length === 5;
      if (key === "tiebreaks")
        return m.score_summary.games.some(
          (g) => Math.max(...g) === 7 && Math.min(...g) === 6,
        );
      if (key === "deciders") return isDeciding(m);
      if (key === "straight-sets")
        return m.score_summary.sets.some((n) => n === 0);
      if (key === "thirty-all-games")
        return m.point_tape.some(
          (p) => p.score_before?.replace("–", "-") === "30-30",
        );
      if (key === "matchpoints-saved")
        return m.point_tape.some(
          (p) =>
            p.is_match_point &&
            p.match_point_for &&
            p.winner !== p.match_point_for,
        );
      if (key === "break-conversion" || key === "break-saved")
        return (
          m.point_tape.some((p) => p.is_break_point) ||
          m.statistics.some(
            (s) =>
              s.period.toLowerCase() === "match" &&
              s.name.toLowerCase() === measuredKeys[key]?.toLowerCase(),
          )
        );
      return true;
    });
    const proof = new Map<string, Match>();
    for (const m of source)
      for (const side of [1, 2] as const) {
        const n = side === 1 ? m.player1.name : m.player2.name;
        if (["wins", "hard-wins", "clay-wins", "grass-wins", "deciders", "first-set-comebacks", "two-set-comebacks", "straight-sets", "five-set-wins", "top10-wins"].includes(key) && winnerName(m) !== n) continue;
        if (opponentRankLimit !== null) {
          const opponentRank = side === 1 ? m.context?.rank2 : m.context?.rank1;
          if (!opponentRank || opponentRank > opponentRankLimit || opponentRank < 1 || winnerName(m) !== n) continue;
        }
        if (key === "tiebreaks" && !m.score_summary.games.some(g => g[side-1] === 7 && g[2-side] === 6)) continue;
        if (key === "matchpoints-saved" && !m.point_tape.some(p => p.is_match_point && p.match_point_for === 3-side && p.winner === side)) continue;
        if (key === "thirty-all-games") {
          const lever = analyzePointTape(m.point_tape).pressure.thirtyAll[side === 1 ? "first" : "second"];
          if (!lever.leverWon) continue;
        }
        if (["break-conversion", "break-saved"].includes(key) && !(statFraction(m, side, measuredKeys[key])?.[1])) continue;
        if (!proof.has(n) || chronological(proof.get(n)!, m) < 0) proof.set(n, m);
      }
    const rows = (pressure ? prs : records).flatMap((r) => {
      let value = def.value(r);
      if (value === null) return [];
      let detail = def.detail(r);
      const nums = detail.match(/\d+(?:[.,]\d+){0,}/g);
      let sample = r.played;
      if (def.unit === "%") {
        sample = Number(nums?.[1]?.replace(/\./g, "") || nums?.[0] || 0);
        if (sample) value = (Number(nums?.[0] || 0) / sample) * 100;
      }
      if (key === "top10-wins") sample = r.extra.top10Played || 0;
      if (key === "top5-wins") sample = r.extra.top5Played || 0;
      if (key === "number-one-wins") sample = r.extra.numberOnePlayed || 0;
      if (key === "tiebreaks") sample = r.tieBreaksPlayed;
      if (key === "finals-played") sample = r.finalsPlayed;
      if (key === "two-set-comebacks")
        detail = `${r.twoSetComebacks} remontadas de dos sets · ${r.played} partidos`;
      if (key === "first-set-comebacks")
        detail = `${r.firstSetComebacks} remontadas · ${r.played} partidos`;
      if (key === "finals-played")
        detail = `${r.finalsWon} ganadas · ${r.finalsPlayed - r.finalsWon} perdidas`;
      return [person(r.name, value, sample, detail, proof.get(r.name))];
    });
    add(
      id,
      title,
      group,
      key === "two-set-comebacks"
        ? "Victorias después de perder los dos primeros sets. El número cuenta remontadas, no todos los encuentros del jugador."
        : key === "first-set-comebacks"
          ? "Victorias después de perder el primer set. Solo resultados completos del archivo."
          : key === "top10-wins"
            ? "Victorias ante un rival situado en el top 10 el día del partido. Solo ranking de entonces; la división indica encuentros con ese rival."
            : key === "top5-wins"
              ? "Victorias ante un rival situado en el top 5 el día del partido. Solo ranking de entonces; la división indica encuentros con ese rival."
              : key === "number-one-wins"
                ? "Victorias ante el número uno el día del partido. Solo ranking de entonces; la división indica encuentros con ese rival."
            : def.unit === "%"
              ? "Porcentaje sobre los casos registrados; cada fila incluye su división."
              : "Resultados completos. Excluye abandonos, incomparecencias y tanteos en revisión.",
      rows,
      min,
      def.unit === "%",
      source,
    );
  };
  const ml = (
    id: string,
    title: string,
    group: string,
    definition: string,
    source: Match[],
    value: (m: Match) => number,
    display?: (m: Match) => string,
  ) =>
    add(
      id,
      title,
      group,
      definition,
      source.map((m) => matchRow(m, value(m), display?.(m))),
      1,
      false,
      source,
    );
  add(
    "finales-ganadas",
    "Más finales ganadas en este archivo",
    "Títulos y finales",
    "Títulos obtenidos en finales con resultado completo. No son todos los títulos de una carrera.",
    records.map((r) =>
      person(
        r.name,
        r.finalsWon,
        r.finalsPlayed,
        `${r.finalsWon}–${r.finalsPlayed - r.finalsWon} en finales`,
        finals.find((m) => winnerName(m) === r.name),
      ),
    ),
    5,
    false,
    finals,
  );
  metric(
    "finales-jugadas",
    "Más finales jugadas en este archivo",
    "Títulos y finales",
    "finals-played",
  );
  add(
    "efectividad-finales",
    "Efectividad en finales",
    "Títulos y finales",
    "Finales ganadas entre finales disputadas. Muestras inferiores a 50, en una lista secundaria.",
    records.map((r) =>
      person(
        r.name,
        (r.finalsWon / r.finalsPlayed) * 100,
        r.finalsPlayed,
        `${r.finalsWon}–${r.finalsPlayed - r.finalsWon} · ${r.finalsPlayed} finales`,
        finals.find(m => m.player1.name === r.name || m.player2.name === r.name),
      ),
    ),
    5,
    true,
    finals,
  );
  const finalsAfterOpening = new Map<string, { won: number; played: number; proof?: Match }>();
  for (const m of finals) {
    const opening = m.score_summary.games[0];
    const side = opening[0] < opening[1] ? 1 : 2;
    const name = side === 1 ? m.player1.name : m.player2.name;
    const row = finalsAfterOpening.get(name) || { won: 0, played: 0 };
    row.played++;
    if (m.winner === side) {
      row.won++;
      row.proof = m;
    }
    finalsAfterOpening.set(name, row);
  }
  add(
    "finales-remontadas-primer-set",
    "Finales ganadas tras perder el primer set",
    "Títulos y finales",
    "Solo finales válidas de este archivo. La división cuenta las finales en las que el jugador perdió el primer set.",
    [...finalsAfterOpening].map(([name, row]) =>
      person(name, row.won, row.played, `${row.won} de ${row.played} finales tras ceder el primer set`, row.proof),
    ),
    1,
    false,
    finals,
  );
  add(
    "titulos-torneo",
    "Más títulos en un mismo torneo",
    "Títulos y finales",
    "Finales ganadas por jugador y torneo. Los precursores anteriores a 1990 conservan su categoría.",
    grouped(finals, (m, n) => `${n} · ${tournamentName(m.tournament)}`),
    1,
    false,
    finals,
  );
  add(
    "titulos-un-masters",
    "Más títulos en un mismo Masters 1000",
    "Títulos y finales",
    "Solo Masters 1000 desde 1990. Precursores excluidos.",
    grouped(
      finals.filter((m) => m.category === "Masters 1000" && m.year >= 1990),
      (m, n) => `${n} · ${tournamentName(m.tournament)}`,
    ),
    1,
    false,
    finals.filter((m) => m.category === "Masters 1000"),
  );
  for (const [category, slug] of [
    ["ATP 500", "atp-500"],
    ["ATP 250", "atp-250"],
  ] as const) {
    const tierMatches = matches.filter(
      (m) => m.category === category && m.year >= 2023,
    );
    const tierFinals = tierMatches.filter(final);
    const tierPlayers = buildSeasonAnalytics(tierMatches).players;
    const scope = `Solo ${category} con categoría confirmada para su temporada desde 2023; excluye Masters y torneos de nivel no especificado.`;
    add(
      `${slug}-titulos`,
      `Más títulos ATP ${category.slice(4)}`,
      "Títulos y finales",
      `Finales ganadas. ${scope}`,
      tierPlayers.map((r) =>
        person(
          r.name,
          r.finalsWon,
          r.finalsPlayed,
          `${r.finalsWon}–${r.finalsPlayed - r.finalsWon} en finales`,
          tierFinals.find((m) => winnerName(m) === r.name),
        ),
      ),
      1,
      false,
      tierFinals,
    );
    add(
      `${slug}-finales`,
      `Más finales jugadas en ATP ${category.slice(4)}`,
      "Títulos y finales",
      `Finales disputadas, ganadas o perdidas. ${scope}`,
      tierPlayers.map((r) =>
        person(
          r.name,
          r.finalsPlayed,
          r.finalsPlayed,
          `${r.finalsWon} ganadas · ${r.finalsPlayed - r.finalsWon} perdidas`,
          tierFinals.find((m) =>
            m.player1.name === r.name || m.player2.name === r.name,
          ),
        ),
      ),
      1,
      false,
      tierFinals,
    );
    add(
      `${slug}-titulos-un-torneo`,
      `Más títulos en un mismo torneo ATP ${category.slice(4)}`,
      "Títulos y finales",
      `Finales ganadas por jugador y torneo. ${scope}`,
      grouped(tierFinals, (m, n) => `${n} · ${tournamentName(m.tournament)}`),
      1,
      false,
      tierFinals,
    );
    add(
      `${slug}-victorias`,
      `Más victorias en ATP ${category.slice(4)}`,
      "Victorias",
      `Partidos ganados con resultado completo. ${scope}`,
      tierPlayers.map((r) =>
        person(
          r.name,
          r.wins,
          r.played,
          `${r.wins}–${r.losses} en ${category}`,
          tierMatches.find((m) => winnerName(m) === r.name),
        ),
      ),
      1,
      false,
      tierMatches,
    );
  }
  for (const s of ["hard", "clay", "grass"] as Surface[]) {
    const label = { hard: "dura", clay: "tierra", grass: "hierba" }[s],
      source = finals.filter((m) => m.surface === s),
      masters = source.filter(
        (m) => m.category === "Masters 1000" && m.year >= 1990,
      );
    add(
      `titulos-${s}`,
      `Más títulos sobre ${label}`,
      "Títulos y finales",
      "Finales ganadas en esta superficie, solo en el archivo.",
      grouped(source, (_m, n) => n),
      1,
      false,
      source,
    );
    add(
      `masters-${s}`,
      `Más títulos de Masters 1000 sobre ${label}`,
      "Títulos y finales",
      "Solo Masters 1000 desde 1990; precursores excluidos.",
      grouped(masters, (_m, n) => n),
      1,
      false,
      masters,
    );
    metric(
      `victorias-${s}`,
      `Más victorias sobre ${label}`,
      "Victorias",
      `${s}-wins`,
    );
  }
  const finalsByName = new Map<string, Match[]>();
  for (const m of [...finals].sort(chronological))
    for (const n of [m.player1.name, m.player2.name]) {
      const list = finalsByName.get(n) || [];
      list.push(m);
      finalsByName.set(n, list);
    }
  for (const won of [true, false]) {
    const rows = [...finalsByName].map(([name, list]) => {
      let best = 0,
        streak = 0,
        proof: Match | undefined;
      for (const m of list) {
        streak = (winnerName(m) === name) === won ? streak + 1 : 0;
        if (streak > best) {
          best = streak;
          proof = m;
        }
      }
      return person(
        name,
        best,
        list.length,
        `${best} finales consecutivas ${won ? "ganadas" : "perdidas"}`,
        proof,
      );
    });
    add(
      won ? "finales-seguidas-ganadas" : "finales-seguidas-perdidas",
      `Finales seguidas ${won ? "ganadas" : "perdidas"}`,
      "Títulos y finales",
      "Secuencia de finales de estos torneos, en orden de edición.",
      rows,
      1,
      false,
      finals,
    );
  }
  metric("victorias", "Más victorias en este archivo", "Victorias", "wins");
  add(
    "victorias-temporada",
    "Más victorias en una temporada",
    "Victorias",
    "Resultados ganados por jugador y año.",
    grouped(matches, (m, n) => `${n} · ${m.year}`),
  );
  metric("top-10", "Más victorias ante el top 10", "Victorias", "top10-wins");
  metric("top-5", "Más victorias ante el top 5", "Victorias", "top5-wins");
  metric("numero-uno", "Más victorias ante el número uno", "Victorias", "number-one-wins");
  metric(
    "sin-ceder-set",
    "Más victorias sin ceder un set",
    "Victorias",
    "straight-sets",
  );
  const bagels = new Map<string, Match[]>();
  for (const m of matches)
    for (const s of [1, 2] as const)
      if (m.score_summary.games.some((g) => g[s - 1] === 6 && g[2 - s] === 0)) {
        const n = s === 1 ? m.player1.name : m.player2.name;
        const list = bagels.get(n) || [];
        list.push(m);
        bagels.set(n, list);
      }
  add(
    "seis-cero",
    "Más partidos con un 6–0",
    "Victorias",
    "Partidos con al menos un set ganado por 6–0; cada partido cuenta una vez.",
    [...bagels].map(([n, ms]) =>
      person(n, ms.length, ms.length, `${ms.length} partidos`, ms[0]),
    ),
  );
  const streakProof = new Map<string, {current:number; best:number; proof?:Match}>();
  for (const m of [...matches].sort((a,b) => a.score_summary.timestamp.localeCompare(b.score_summary.timestamp) || a.match_id.localeCompare(b.match_id))) {
    for (const n of [m.player1.name, m.player2.name]) {
      const v = streakProof.get(n) || {current:0,best:0};
      v.current = winnerName(m) === n ? v.current + 1 : 0;
      if (v.current > v.best) { v.best = v.current; v.proof = m; }
      streakProof.set(n,v);
    }
  }
  add(
    "rachas",
    "Rachas de victorias en este archivo",
    "Victorias",
    "Resultados completos consecutivos entre los torneos incluidos. No es una racha de todo el circuito.",
    records.map((r) =>
      person(
        r.name,
        r.longestWinStreak,
        r.played,
        `${r.longestWinStreak} victorias consecutivas · prueba: cierre del tramo`,
        streakProof.get(r.name)?.proof,
      ),
    ),
  );
  for (const indoor of [true, false]) {
    const source = matches.filter((m) => m.context?.indoor === indoor);
    add(
      indoor ? "bajo-techo" : "aire-libre",
      indoor ? "Victorias bajo techo" : "Victorias al aire libre",
      "Victorias",
      "Solo partidos cuya fuente identifica la condición de la sede; no se deduce del nombre del torneo.",
      grouped(source, (_m, n) => n),
      1,
      false,
      source,
    );
  }
  for (const [id, title, key, min] of [
    [
      "remontada-primer-set",
      "Más remontadas tras perder el primer set",
      "first-set-comebacks",
      1,
    ],
    [
      "remontada-dos-sets",
      "Más remontadas tras perder dos sets",
      "two-set-comebacks",
      1,
    ],
    ["victorias-cinco-sets", "Más victorias en cinco sets", "five-set-wins", 1],
    ["porcentaje-cinco-sets", "Efectividad en cinco sets", "five-set-rate", 5],
    ["tie-breaks", "Más tie-breaks ganados", "tiebreaks", 15],
    ["sets-decisivos", "Más sets decisivos ganados", "deciders", 1],
  ] as const)
    metric(id, title, "Remontadas y forma del partido", key, min);
  ml(
    "cinco-sets",
    "Partidos de cinco sets con más juegos",
    "Remontadas y forma del partido",
    "Cinco sets cerrados y ganador coherente, ordenados por número de juegos.",
    matches.filter((m) => m.score_summary.games.length === 5),
    gamesInMatch,
  );
  ml(
    "mas-juegos",
    "Partidos con más juegos",
    "Remontadas y forma del partido",
    "Suma de juegos de todos los sets cerrados.",
    matches,
    gamesInMatch,
  );
  const points = matches.flatMap((m) => {
    const first = statNumber(matchStat(m, 1, "Total points won"));
    const second = statNumber(matchStat(m, 2, "Total points won"));
    const totalFirst = statNumber(matchStat(m, 1, "Points played"));
    const totalSecond = statNumber(matchStat(m, 2, "Points played"));
    return first !== null && second !== null &&
      totalFirst !== null && totalSecond !== null &&
      first + second === totalFirst && totalFirst === totalSecond
      ? [{ match: m, first, second }]
      : [];
  });
  const fewerPoints = points.filter(({ match, first, second }) =>
    match.winner === 1 ? first < second : second < first,
  );
  add(
    "ganar-con-menos-puntos",
    "Ganó el partido sumando menos puntos",
    "Remontadas y forma del partido",
    "Solo partidos con puntos totales publicados para ambos jugadores y suma coherente con los puntos disputados. La cifra es la diferencia a favor del perdedor.",
    fewerPoints.map(({ match, first, second }) => {
      const difference = Math.abs(first - second);
      return matchRow(match, difference, `${difference} puntos menos`);
    }),
    1,
    false,
    points.map(({ match }) => match),
    true,
  );
  ml(
    "final-ultimo-set",
    "Finales decididas en el último set",
    "Títulos y finales",
    "Finales que llegaron al set decisivo de su formato.",
    finals.filter(isDeciding),
    gamesInMatch,
  );
  ml(
    "marcador-ajustado",
    "Marcadores más ajustados",
    "Remontadas y forma del partido",
    formula,
    matches,
    closeness,
    (m) => `${closeness(m)} / 100`,
  );
  const marathon = shelves.find((s) => s.id === "juegos-maratonicos")!;
  ml(
    "juegos-maratonicos",
    "Juegos con más de ocho deuces",
    "Remontadas y forma del partido",
    "Juegos íntegros en secuencias fiables; cuenta llegadas a 40–40.",
    reliable.filter((m) => marathon.select!(m)),
    (m) => marathon.value!(m),
  );
  for (const [id, title, key, min] of [
    ["30-30", "Juegos ganados tras ganar el 30–30", "thirty-all-games", 10],
    ["breaks-convertidos", "Breaks convertidos", "break-conversion", 10],
    ["breaks-salvados", "Breaks salvados", "break-saved", 10],
    [
      "bolas-partido-salvadas",
      "Bolas de partido salvadas",
      "matchpoints-saved",
      1,
    ],
  ] as const)
    metric(id, title, "Presión", key, min, true);
  const savedInVictory = matches.flatMap((m) => {
    const saved = statFraction(m, m.winner!, "Break points saved");
    return saved ? [{ match: m, saved: saved[0], faced: saved[1] }] : [];
  });
  add(
    "breaks-salvados-victoria",
    "Más bolas de break salvadas para ganar",
    "Presión",
    "Solo victorias con bolas de break afrontadas y estadística publicada. La división es salvadas entre afrontadas en ese partido.",
    savedInVictory.map(({ match, saved, faced }) =>
      matchRow(match, saved, `${saved} de ${faced} salvadas`),
    ),
    1,
    false,
    savedInVictory.map(({ match }) => match),
    true,
  );
  const failed = new Map<string, { won: number; total: number; proof: Match }>();
  for (const m of reliable)
    for (const p of m.point_tape)
      if (p.server && p.is_break_point && p.first_serve_in === false) {
        const n = p.server === 1 ? m.player1.name : m.player2.name,
          v = failed.get(n) || { won: 0, total: 0, proof: m };
        v.total++;
        if (p.break_converted) { v.won++; v.proof = m; }
        failed.set(n, v);
      }
  add(
    "break-tras-fallo",
    "Breaks en contra tras fallar el primer saque",
    "Presión",
    "Solo puntos de break con primer saque fallado explícitamente y cinta fiable.",
    [...failed].map(([n, v]) =>
      person(n, v.won, v.total, `${v.won} de ${v.total} ocasiones`, v.proof),
    ),
    1,
    false,
    reliable,
  );
  const timed = matches.filter((m) => publishedMatchMinutes(m) !== null);
  ml(
    "mas-largos",
    "Partidos más largos",
    "Tiempo, edad y calendario",
    "Solo minutos publicados de hasta 12 horas. No compara partidos sin duración ni valores fuera de rango.",
    timed,
    (m) => publishedMatchMinutes(m)!,
    (m) => durationLabel(publishedMatchMinutes(m)!),
  );
  const ageSource = finals.filter(
      (m) => !!m.context?.age1 || !!m.context?.age2,
    ),
    ages = ageSource.flatMap((m) =>
      ([1, 2] as const).flatMap((s) => {
        const age = s === 1 ? m.context?.age1 : m.context?.age2,
          n = s === 1 ? m.player1.name : m.player2.name;
        return age
          ? [
              {
                ...person(
                  n,
                  age,
                  1,
                  `${tournamentName(m.tournament)} · ${m.year}`,
                  m,
                ),
                display: `${number(age, 1)} años`,
                href: `/match/${m.match_id}`,
              },
            ]
          : [];
      }),
    );
  add(
    "finalistas-jovenes",
    "Finalistas más jóvenes",
    "Tiempo, edad y calendario",
    "Edad publicada; nunca estimada.",
    ages,
    1,
    false,
    ageSource,
    false,
    true,
  );
  add(
    "finalistas-veteranos",
    "Finalistas más veteranos",
    "Tiempo, edad y calendario",
    "Edad publicada; nunca estimada.",
    ages,
    1,
    false,
    ageSource,
  );
  ml(
    "diferencia-edad",
    "Mayor diferencia de edad en una final",
    "Tiempo, edad y calendario",
    "Solo finales con la edad publicada de ambos.",
    finals.filter((m) => m.context?.age1 && m.context?.age2),
    (m) => Math.abs(m.context!.age1! - m.context!.age2!),
    (m) => `${number(Math.abs(m.context!.age1! - m.context!.age2!), 1)} años`,
  );
  add(
    "temporadas-finales",
    "Temporadas con más finales",
    "Tiempo, edad y calendario",
    "Finales por jugador y año.",
    grouped(finals, (m, n) => `${n} · ${m.year}`, true),
    1,
    false,
    finals,
  );
  add(
    "temporadas-titulos",
    "Temporadas con más títulos",
    "Tiempo, edad y calendario",
    "Finales ganadas por jugador y año.",
    grouped(finals, (m, n) => `${n} · ${m.year}`),
    1,
    false,
    finals,
  );
  const today = new Date().toISOString().slice(5, 10),
    anniversary = matches.filter(
      (m) =>
        m.context?.dateLabel === "Fecha del partido" &&
        m.context.date?.slice(5, 10) === today,
    );
  ml(
    "tal-dia-como-hoy",
    "Tal día como hoy",
    "Tiempo, edad y calendario",
    "Fechas exactas de partido, nunca el inicio del torneo.",
    anniversary,
    (m) => m.year,
  );
  const pairs = rivalryDirectory(matches);
  for (const f of [false, true])
    add(
      f ? "parejas-finales" : "parejas",
      f ? "Más finales entre dos nombres" : "Más partidos entre dos nombres",
      "Parejas",
      "Solo encuentros de este archivo. No es el cara a cara completo.",
      pairs.map((p) => {
        const ms = p.matches.filter((m) => !f || final(m));
        return {
          name: p.names.join(" – "),
          value: ms.length,
          sample: ms.length,
          detail: `${ms.filter((m) => winnerName(m) === p.names[0]).length}–${ms.filter((m) => winnerName(m) === p.names[1]).length} · solo este archivo`,
          href: `/rivalries/${p.slug}`,
          proof: ms.at(-1),
        };
      }),
    );
  for (const shelf of shelves.filter(
    (s) => s.family === "Saque, resto, golpes" && s.metric,
  )) {
    const def = shelf.metric!,
      stat =
        measuredKeys[def.key] ||
        (def.key.startsWith("golpes-") ? shelf.label : undefined);
    const source = matches.filter((m) =>
      stat
        ? m.statistics.some(
            (s) =>
              s.period.toLowerCase() === "match" &&
              s.name.toLowerCase() === stat.toLowerCase(),
          )
        : m.quality?.tape === "reliable" &&
          m.point_tape.some(
            (p) => p.is_break_point && p.first_serve_in === false,
          ),
    );
    const rows = records.flatMap((r) => {
      let value = def.value(r);
      if (value === null) return [];
      const detail = def.detail(r);
      const field = stat ? r.stats[stat] : undefined;
      const sample =
        def.unit === "%"
          ? field?.total || r.extra.secondBreakTotal || 0
          : field?.samples || r.extra.secondBreakSamples || 0;
      if (def.unit === "%" && sample)
        value = ((field?.won || r.extra.secondBreakWon || 0) / sample) * 100;
      const proof = source.find(m => {
        const side = m.player1.name === r.name ? 1 : m.player2.name === r.name ? 2 : null;
        if (!side) return false;
        if (stat) return def.unit === "%" ? !!statFraction(m, side, stat)?.[1] : statNumber(matchStat(m, side, stat)) !== null;
        return m.point_tape.some(p => p.server === 3-side && p.is_break_point && p.first_serve_in === false);
      });
      return [person(r.name, value, sample, detail, proof)];
    });
    add(
      shelf.id,
      shelf.label,
      "Medidas de partido",
      "Solo partidos con este dato. No es todo el archivo.",
      rows,
      def.min || 1,
      def.unit === "%",
      source,
      true,
    );
  }
  cache.set(cacheKey, result);
  return result;
}
export function playerFact(
  name: string,
  matches: Match[],
): { text: string; proof: Match } | null {
  const wins = matches
      .filter((m) => winnerName(m) === name)
      .sort(chronological),
    comebacks = wins.filter((m) => lostOpening(m, 2));
  if (comebacks.length)
    return {
      text: `${name} remontó dos sets ${comebacks.length} ${comebacks.length === 1 ? "vez" : "veces"} en este archivo. La más reciente fue en ${tournamentName(comebacks.at(-1)!.tournament)} ${comebacks.at(-1)!.year}.`,
      proof: comebacks.at(-1)!,
    };
  const titles = wins.filter(final),
    counts = grouped(
      titles,
      (m, n) => `${n} · ${tournamentName(m.tournament)}`,
    ).sort((a, b) => b.value - a.value);
  if (counts[0]?.value >= 3)
    return {
      text: `${name} ganó ${counts[0].value} finales de ${counts[0].detail} en este archivo (${years(titles.filter((m) => tournamentName(m.tournament) === counts[0].detail))}).`,
      proof: counts[0].proof!,
    };
  return null;
}
export function tournamentPieces(matches: Match[], slug: string) {
  const t = TOURNAMENTS.find((t) => t.slug === slug);
  if (!t) return null;
  const rows = matches.filter((m) => m.tournament === t.name),
    finals = rows.filter(final),
    rs = buildSeasonAnalytics(rows).players;
  return {
    t,
    matches: rows,
    finals,
    champion: [...finals].sort(chronological).at(-1),
    titles: rs
      .filter((r) => r.finalsWon)
      .sort((a, b) => b.finalsWon - a.finalsWon)
      .map((r) =>
        person(
          r.name,
          r.finalsWon,
          r.finalsPlayed,
          `${r.finalsWon}–${r.finalsPlayed - r.finalsWon} en finales`,
          finals.find(m => winnerName(m) === r.name),
        ),
      ),
    played: rs
      .filter((r) => r.finalsPlayed)
      .sort((a, b) => b.finalsPlayed - a.finalsPlayed)
      .map((r) =>
        person(
          r.name,
          r.finalsPlayed,
          r.finalsPlayed,
          `${r.finalsWon} finales ganadas`,
          finals.find(m => m.player1.name === r.name || m.player2.name === r.name),
        ),
      ),
    rate: rs
      .filter((r) => r.played >= 10)
      .sort((a, b) => b.wins / b.played - a.wins / a.played)
      .map((r) =>
        person(
          r.name,
          (r.wins / r.played) * 100,
          r.played,
          `${r.wins} de ${r.played} partidos`,
          rows.find(m => m.player1.name === r.name || m.player2.name === r.name),
        ),
      ),
  };
}

export function firstRecordedChampion(
  matches: Match[],
): { name: string; year: number; proof: Match } | null {
  const finals = matches.filter((m) => eligibleMatch(m) && final(m));
  if (!finals.length) return null;
  const year = yearExtent(finals)!.first,
    first = finals.filter((m) => m.year === year);
  const names = [
    ...new Set(first.map(winnerName).filter((n): n is string => !!n)),
  ];
  return names.length === 1 ? { name: names[0], year, proof: first[0] } : null;
}
