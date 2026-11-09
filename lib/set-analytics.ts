import type { Match } from './types';

export type SetAnalytics = {
  set: number;
  games: [number, number];
  points: [number, number];
  pointShare: [number, number];
  breaks: [number, number];
  longestRun: [number, number];
};

/**
 * Split a validated point tape by set. We deliberately return no estimate for
 * score-only matches: a missing point is not a lost point and must not become 0.
 */
export function setAnalytics(match: Match): SetAnalytics[] {
  if (match.quality?.tape !== 'reliable' || !match.point_tape.length) return [];

  return match.score_summary.games.flatMap((games, index) => {
    const set = index + 1;
    const tape = match.point_tape.filter((point) => point.set === set && point.winner);
    if (tape.length < 8) return [];

    const points: [number, number] = [0, 0];
    const breaks: [number, number] = [0, 0];
    const longestRun: [number, number] = [0, 0];
    let previous: 1 | 2 | null = null;
    let run = 0;

    for (const point of tape) {
      const winner = point.winner!;
      points[winner - 1]++;
      if (point.break_converted === true) breaks[winner - 1]++;
      run = winner === previous ? run + 1 : 1;
      previous = winner;
      longestRun[winner - 1] = Math.max(longestRun[winner - 1], run);
    }

    const total = points[0] + points[1];
    return [{
      set,
      games: [games[0], games[1]],
      points,
      pointShare: [points[0] / total * 100, points[1] / total * 100],
      breaks,
      longestRun,
    }];
  });
}
