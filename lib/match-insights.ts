import { findStat } from './statistics';
import { isRecordedTiebreak } from './historical-rules';
import type { Match, MatchStat } from './types';

export type MatchInsightValue = {
  main: string;
  detail?: string;
  numeric?: number;
};

export type MatchInsight = {
  key: string;
  label: string;
  first: MatchInsightValue;
  second: MatchInsightValue;
  group: 'control' | 'decisive' | 'patterns';
  neutral?: boolean;
};

function numberFromStat(stat: MatchStat | undefined) {
  if (!stat) return null;
  if (stat.won !== null) return stat.won;
  const value = Number.parseFloat(stat.value.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function percentage(won: number, total: number): MatchInsightValue {
  return {
    main: `${Math.round((won / total) * 100)}%`,
    detail: `${won} de ${total}`,
    numeric: (won / total) * 100,
  };
}

function integer(value: number, detail?: string): MatchInsightValue {
  return { main: String(value), detail, numeric: value };
}

function rateFromStat(stat: MatchStat | undefined) {
  if (!stat || stat.won === null || stat.total === null || stat.total <= 0) return null;
  return stat.won / stat.total;
}

function multiplier(value: number): MatchInsightValue {
  return {
    main: `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}×`,
    numeric: value,
  };
}

function signedValue(value: number, suffix = ''): MatchInsightValue {
  return { main: `${signed(value)}${suffix}`, numeric: value };
}

function statistic(match: Match, side: 1 | 2, names: string[]) {
  for (const name of names) {
    const value = findStat(match.statistics, side, name);
    if (value) return value;
  }
}

function count(match: Match, side: 1 | 2, names: string[]) {
  return numberFromStat(statistic(match, side, names));
}

function measuredRate(match: Match, side: 1 | 2, numeratorNames: string[], totalNames: string[] = []) {
  const numerator = statistic(match, side, numeratorNames);
  const direct = rateFromStat(numerator);
  if (direct !== null) return direct;
  const won = numberFromStat(numerator);
  const total = count(match, side, totalNames);
  return won !== null && total !== null && total > 0 && won <= total ? won / total : null;
}

function maximumPointRuns(match: Match): [number, number] | null {
  if (match.quality?.tape !== 'reliable' || match.point_tape.length < 12) return null;
  const maximum: [number, number] = [0, 0];
  let previous: 1 | 2 | null = null;
  let run = 0;
  for (const point of match.point_tape) {
    if (!point.winner) continue;
    run = point.winner === previous ? run + 1 : 1;
    previous = point.winner;
    maximum[point.winner - 1] = Math.max(maximum[point.winner - 1], run);
  }
  return maximum.some(Boolean) ? maximum : null;
}

/**
 * High-signal comparisons derived only from documented statistics or a
 * validated point tape. Missing measures stay absent instead of becoming 0.
 */
export function matchInsights(match: Match): MatchInsight[] {
  const insights: MatchInsight[] = [];
  const pointRuns = maximumPointRuns(match);
  if (pointRuns) {
    insights.push({
      key: 'point-run',
      label: 'Mayor racha de puntos',
      first: integer(pointRuns[0], 'puntos seguidos'),
      second: integer(pointRuns[1], 'puntos seguidos'),
      group: 'decisive',
    });
  } else {
    const runs = ([1, 2] as const).map((side) =>
      numberFromStat(statistic(match, side, ['Consecutive points won', 'Máxima racha de puntos'])),
    );
    if (runs.every((value) => value !== null)) {
      insights.push({
        key: 'point-run',
        label: 'Mayor racha de puntos',
        first: integer(runs[0]!, 'puntos seguidos'),
        second: integer(runs[1]!, 'puntos seguidos'),
        group: 'decisive',
      });
    }
  }

  const pressurePoints = match.point_tape.filter(
    (point) => point.winner && (point.is_break_point === true || point.is_match_point === true),
  );
  if (match.quality?.tape === 'reliable' && pressurePoints.length >= 2) {
    const won = ([1, 2] as const).map(
      (side) => pressurePoints.filter((point) => point.winner === side).length,
    );
    insights.push({
      key: 'pressure-points',
      label: 'Puntos de presión ganados',
      first: percentage(won[0], pressurePoints.length),
      second: percentage(won[1], pressurePoints.length),
      group: 'decisive',
    });
  }

  const totalPoints = ([1, 2] as const).map((side) => count(match, side, ['Puntos ganados', 'Total points won']));
  if (totalPoints.every((value) => value !== null)) {
    const margin = totalPoints[0]! - totalPoints[1]!;
    insights.push({
      key: 'point-margin',
      label: 'Balance de puntos',
      first: signedValue(margin),
      second: signedValue(-margin),
      group: 'control',
    });
  }

  const returnRates = ([1, 2] as const).map((side) => measuredRate(match, side, [
    'Puntos ganados al resto', 'Return points won',
  ], ['Puntos al resto jugados', 'Return points played']));
  if (returnRates.every((value) => value !== null && value > 0)) {
    insights.push({
      key: 'dominance-ratio',
      label: 'Dominio global',
      first: multiplier(returnRates[0]! / returnRates[1]!),
      second: multiplier(returnRates[1]! / returnRates[0]!),
      group: 'control',
    });
  }

  const pressureRates = ([1, 2] as const).map((side) => {
    const saved = rateFromStat(statistic(match, side, ['Bolas de break salvadas', 'Break points saved']));
    const converted = rateFromStat(statistic(match, side, ['Bolas de break convertidas', 'Break points converted', 'Break Points Won']));
    return saved === null || converted === null ? null : (saved + converted) / 2;
  });
  if (pressureRates.every((value) => value !== null)) {
    insights.push({
      key: 'break-pressure',
      label: 'Rendimiento bajo presión',
      first: { main: `${Math.round(pressureRates[0]! * 100)}%`, numeric: pressureRates[0]! * 100 },
      second: { main: `${Math.round(pressureRates[1]! * 100)}%`, numeric: pressureRates[1]! * 100 },
      group: 'decisive',
    });
  }

  const serveBalance = ([1, 2] as const).map((side) => {
    const aces = count(match, side, ['Saques directos', 'Aces']);
    const doubleFaults = count(match, side, ['Dobles faltas', 'Double Faults']);
    return aces === null || doubleFaults === null ? null : aces - doubleFaults;
  });
  if (serveBalance.every((value) => value !== null)) {
    insights.push({
      key: 'serve-balance',
      label: 'Balance saque directo',
      first: signedValue(serveBalance[0]!),
      second: signedValue(serveBalance[1]!),
      group: 'control',
    });
  }

  const breakChances = ([1, 2] as const).map((side) => count(match, side, [
    'Bolas de break al resto', 'Break points played', 'Break points faced by opponent',
  ]));
  if (breakChances.every((value) => value !== null)) {
    insights.push({
      key: 'break-chances',
      label: 'Oportunidades de break',
      first: integer(breakChances[0]!),
      second: integer(breakChances[1]!),
      group: 'decisive',
    });
  }

  const serveLift = ([1, 2] as const).map((side) => {
    const first = measuredRate(match, side, ['Puntos ganados con primer saque', '1st serve points won']);
    const second = measuredRate(match, side, ['Puntos ganados con segundo saque', '2nd serve points won']);
    return first === null || second === null ? null : Math.round((first - second) * 100);
  });
  if (serveLift.every((value) => value !== null)) {
    insights.push({
      key: 'first-serve-lift',
      label: 'Diferencia 1.º–2.º saque',
      first: signedValue(serveLift[0]!, ' pp'),
      second: signedValue(serveLift[1]!, ' pp'),
      group: 'patterns',
      neutral: true,
    });
  }

  const winnerError = ([1, 2] as const).map((side) => ({
    winners: numberFromStat(statistic(match, side, ['Golpes ganadores', 'Winners'])),
    errors: numberFromStat(statistic(match, side, ['Errores no forzados', 'Unforced Errors'])),
  }));
  if (winnerError.every((value) => value.winners !== null && value.errors !== null)) {
    insights.push({
      key: 'winner-error-balance',
      label: 'Balance ataque-error',
      first: {
        main: signed(winnerError[0].winners! - winnerError[0].errors!),
        detail: `${winnerError[0].winners} ganadores · ${winnerError[0].errors} errores`,
        numeric: winnerError[0].winners! - winnerError[0].errors!,
      },
      second: {
        main: signed(winnerError[1].winners! - winnerError[1].errors!),
        detail: `${winnerError[1].winners} ganadores · ${winnerError[1].errors} errores`,
        numeric: winnerError[1].winners! - winnerError[1].errors!,
      },
      group: 'control',
    });
  }

  const recordedTiebreaks = match.score_summary.games
    .map((games, index) => ({ games, recorded: isRecordedTiebreak(match, index) }))
    .filter((set) => set.recorded);
  if (recordedTiebreaks.length) {
    const won = ([0, 1] as const).map((side) => recordedTiebreaks.filter(({ games }) => games[side] > games[1 - side]).length);
    insights.push({
      key: 'tiebreaks',
      label: 'Tie-breaks ganados',
      first: integer(won[0]),
      second: integer(won[1]),
      group: 'decisive',
    });
  }

  const net = ([1, 2] as const).map((side) =>
    statistic(match, side, ['Puntos ganados en la red', 'Net Points Won']),
  );
  if (net.every((value) => value?.won !== null && value?.total !== null && (value?.total || 0) > 0)) {
    insights.push({
      key: 'net-points',
      label: 'Puntos ganados en la red',
      first: percentage(net[0]!.won!, net[0]!.total!),
      second: percentage(net[1]!.won!, net[1]!.total!),
      group: 'patterns',
    });
  }

  if (match.quality?.tape === 'reliable') {
    const measuredRallies = match.point_tape.filter((point) => point.winner && point.rally_length !== null && point.rally_length > 0);
    const wonRallies = ([1, 2] as const).map((side) => measuredRallies.filter((point) => point.winner === side));
    if (wonRallies.every((points) => points.length >= 3)) {
      const average = wonRallies.map((points) => points.reduce((sum, point) => sum + point.rally_length!, 0) / points.length);
      insights.push({
        key: 'rally-length',
        label: 'Longitud media al ganar',
        first: { main: `${average[0].toFixed(1).replace('.', ',')} golpes`, numeric: average[0] },
        second: { main: `${average[1].toFixed(1).replace('.', ',')} golpes`, numeric: average[1] },
        group: 'patterns',
        neutral: true,
      });
    }
    const longRallies = measuredRallies.filter((point) => point.rally_length! >= 9);
    if (longRallies.length >= 4) {
      const won = ([1, 2] as const).map((side) => longRallies.filter((point) => point.winner === side).length);
      insights.push({
        key: 'long-rallies',
        label: 'Peloteos de 9+ golpes',
        first: percentage(won[0], longRallies.length),
        second: percentage(won[1], longRallies.length),
        group: 'patterns',
      });
    }
  }

  return insights;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
