import { winnerName } from './editorial';
import type { Match } from './types';

export type PlayerTrendRow = {
  key: string;
  label: string;
  played: number;
  wins: number;
  rate: number;
};

function summarize(key: string, label: string, matches: Match[], player: string): PlayerTrendRow {
  const wins = matches.filter(match => winnerName(match) === player).length;
  return { key, label, played: matches.length, wins, rate: matches.length ? wins / matches.length * 100 : 0 };
}

export function playerTrends(matches: Match[], player: string) {
  const categories = [...matches.reduce((groups, match) => {
    const key = match.category || 'Sin categoría';
    groups.set(key, [...(groups.get(key) || []), match]);
    return groups;
  }, new Map<string, Match[]>())]
    .map(([category, rows]) => summarize(category, category, rows, player))
    .filter(row => row.played >= 3)
    .sort((a, b) => b.played - a.played || b.rate - a.rate)
    .slice(0, 6);

  const years = [...new Set(matches.map(match => match.year))].sort((a, b) => a - b);
  const stages: PlayerTrendRow[] = [];
  if (years.length >= 6) {
    const size = Math.ceil(years.length / 3);
    const chunks = [years.slice(0, size), years.slice(size, size * 2), years.slice(size * 2)].filter(chunk => chunk.length);
    const names = ['Inicio', 'Consolidación', 'Etapa reciente'];
    chunks.forEach((chunk, index) => {
      const rows = matches.filter(match => chunk.includes(match.year));
      const range = chunk[0] === chunk.at(-1) ? String(chunk[0]) : `${chunk[0]}–${chunk.at(-1)}`;
      stages.push(summarize(`stage-${index}`, `${names[index]} · ${range}`, rows, player));
    });
  }

  return { categories, stages };
}
