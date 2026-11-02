import type { Match } from './types';
import { round } from './cuaderno/model';
import { visibleTournamentCategory } from './tournament-tier';
import { providerRoundName } from './provider-publication';

export function browserRound(match: Match) {
  const normalized = providerRoundName(match.round);
  const label = round(normalized === match.round ? match : { ...match, round: normalized });
  return ({ Octavos: 'Octavos de final', Cuartos: 'Cuartos de final', Semifinal: 'Semifinales', RR: 'Fase de grupos', BR: 'Partido por el bronce', ER: 'Rondas iniciales' } as Record<string, string>)[label] || label;
}

export const browserRounds = ['Ronda de 128', 'Ronda de 64', 'Ronda de 32', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];

export function browserCategory(match: Match): string | null {
  const name = match.tournament.toLowerCase();
  if (/davis/.test(name)) return 'Copa Davis';
  if (/united cup/.test(name)) return 'United Cup';
  if (/olympic|olímpic|olimpic/.test(name)) return 'Juegos Olímpicos';
  if (/next gen/.test(name)) return 'Next Gen Finals';
  if (/\b(?:atp|wta|tour) finals\b|masters cup|year.end|^finals\s*[-–]/.test(name)) return match.tour === 'wta' || /\bwta finals\b/.test(name) ? 'WTA Finals' : 'ATP Finals';
  if (/laver cup/.test(name)) return 'Laver Cup';
  const category = visibleTournamentCategory(match.category, match.tournament, match.year);
  if (category && /precursor|histórico|otro torneo/i.test(category)) return 'Otros torneos';
  return category;
}
