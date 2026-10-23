import type { Match } from '../types';
import type { PlayerRecord } from '../season-analytics';
import { publishedMatchMinutes } from '../duration';
import { isDeciding } from '../archive-insights';
import { isRecordedTiebreak } from '../historical-rules';

type Measure = {
  id: string; title: string; group: string; definition: string; minimum: number;
  numerator: (r: PlayerRecord) => number;
  denominator?: (r: PlayerRecord) => number;
  source?: (m: Match) => boolean;
};
const extra = (key: string) => (r: PlayerRecord) => r.extra[key] || 0;
const ranked = (m: Match) => !!m.context?.rankLabel && !/descarga/i.test(m.context.rankLabel);
const long = (m: Match) => (publishedMatchMinutes(m) || 0) >= 180;
const rate = (id: string, title: string, group: string, definition: string, numerator: Measure['numerator'], denominator: Measure['numerator'], minimum: number, source?: Measure['source']): Measure =>
  ({ id, title, group, definition, numerator, denominator, minimum, source });
const count = (id: string, title: string, group: string, definition: string, numerator: Measure['numerator'], source?: Measure['source']): Measure =>
  ({ id, title, group, definition, numerator, minimum: 1, source });

/** Explicit denominators: never infer a statistical sample by parsing display text. */
export const additionalRecords: readonly Measure[] = [
  count('partidos-disputados', 'Más partidos disputados', 'Victorias', 'Encuentros completos y validados del archivo, no el total oficial de una carrera.', r => r.played),
  count('rivales-derrotados', 'Más rivales diferentes derrotados', 'Victorias', 'Cada rival derrotado cuenta una sola vez dentro de la selección.', r => new Set(r.opponentsBeaten).size),
  count('temporadas-disputadas', 'Más temporadas con partidos', 'Tiempo, edad y calendario', 'Años distintos con al menos un encuentro completo registrado.', r => r.seasons.length),
  count('sets-ganados', 'Más sets ganados', 'Victorias', 'Suma de sets ganados en resultados completos.', r => r.setsWon),
  count('juegos-ganados', 'Más juegos ganados', 'Victorias', 'Suma de juegos ganados en resultados completos.', extra('gamesWon')),
  count('sets-seis-cero', 'Más sets ganados 6–0', 'Remontadas y forma del partido', 'Cuenta cada set 6–0, no solo los partidos con un 6–0.', r => r.sixLoveSets),
  count('sets-ajustados-ganados', 'Más sets ajustados ganados', 'Remontadas y forma del partido', 'Sets ganados por uno o dos juegos de diferencia, incluidos desempates.', r => r.closeSetsWon),
  rate('efectividad-partidos', 'Porcentaje de partidos ganados', 'Victorias', 'Victorias entre partidos completos disputados.', r => r.wins, r => r.played, 20),
  rate('efectividad-sets', 'Porcentaje de sets ganados', 'Victorias', 'Sets ganados entre todos los sets disputados.', r => r.setsWon, r => r.setsWon + r.setsLost, 20),
  rate('efectividad-juegos', 'Porcentaje de juegos ganados', 'Victorias', 'Juegos ganados entre todos los juegos disputados.', extra('gamesWon'), r => (r.extra.gamesWon || 0) + (r.extra.gamesLost || 0), 100),
  rate('efectividad-sin-ceder-set', 'Victorias sin ceder un set (%)', 'Remontadas y forma del partido', 'Victorias en sets corridos entre todas las victorias, no entre todos los partidos.', r => r.straightSetWins, r => r.wins, 5),
  rate('conservar-primer-set', 'Eficacia tras ganar el primer set', 'Remontadas y forma del partido', 'Victorias entre encuentros que comenzaron ganando el primer set.', extra('afterOpeningWon'), extra('openingWon'), 10),
  rate('recuperar-primer-set', 'Eficacia tras perder el primer set', 'Remontadas y forma del partido', 'Victorias entre encuentros que comenzaron perdiendo el primer set.', extra('afterOpeningLost'), extra('openingLost'), 10),
  rate('recuperar-dos-sets', 'Eficacia tras perder los dos primeros sets', 'Remontadas y forma del partido', 'Victorias entre encuentros que comenzaron perdiendo los dos primeros sets.', extra('twoDownWins'), extra('twoDown'), 5),
  rate('efectividad-tiebreaks', 'Porcentaje de tie-breaks ganados', 'Presión', 'Desempates ganados entre desempates registrados; respeta las reglas históricas de cada torneo.', r => r.tieBreaksWon, r => r.tieBreaksPlayed, 10),
  rate('efectividad-decisivos', 'Porcentaje de sets decisivos ganados', 'Presión', 'Victorias entre encuentros que llegaron al set decisivo de su formato.', r => r.decidingSetWins, r => r.decidingSetPlayed, 10),
  rate('efectividad-top-10', 'Porcentaje de victorias ante el top 10', 'Victorias', 'Victorias ante el top 10 del día del partido. Excluye rankings de descarga.', extra('top10Wins'), extra('top10Played'), 10, m => ranked(m) && [m.context?.rank1, m.context?.rank2].some(rank => !!rank && rank > 0 && rank <= 10)),
  rate('efectividad-peor-ranking', 'Victorias con peor ranking (%)', 'Victorias', 'Victorias cuando ambos rankings históricos constan y el propio era peor que el rival.', extra('underdogWins'), extra('underdogPlayed'), 10, m => ranked(m) && (m.context?.rank1 || 0) > 0 && (m.context?.rank2 || 0) > 0 && m.context?.rank1 !== m.context?.rank2),
  count('victorias-tres-horas', 'Victorias en tres horas o más', 'Tiempo, edad y calendario', 'Victorias en encuentros con al menos 180 minutos publicados. No se estima la duración.', extra('longWins'), long),
  rate('efectividad-tres-horas', 'Eficacia en partidos de tres horas', 'Tiempo, edad y calendario', 'Victorias entre encuentros con al menos 180 minutos documentados.', extra('longWins'), extra('longPlayed'), 5, long),
  ...(['hard', 'clay', 'grass', 'carpet'] as const).map(surface => {
    const label = { hard: 'dura', clay: 'tierra batida', grass: 'hierba', carpet: 'moqueta' }[surface];
    return rate(`efectividad-${surface}`, `Porcentaje de victorias en ${label}`, 'Superficies', `Victorias entre partidos completos disputados en ${label}.`, r => r.surfaces[surface].wins, r => r.surfaces[surface].played, 10, m => m.surface === surface);
  }),
  count('victorias-moqueta', 'Más victorias en moqueta', 'Superficies', 'Victorias en encuentros completos cuya superficie está identificada como moqueta.', r => r.surfaces.carpet.wins, m => m.surface === 'carpet'),
];

/** Match list behind each new measure, including the actual denominator cases. */
export function additionalRecordEvidence(id: string, matches: Match[], name: string): Match[] | null {
  const spec = additionalRecords.find(item => item.id === id);
  if (!spec) return null;
  return matches.filter(match => {
    if (spec.source && !spec.source(match)) return false;
    const side = match.player1.name === name ? 0 : 1;
    const won = match.winner === side + 1;
    const sets = match.score_summary.games;
    if (['rivales-derrotados', 'efectividad-sin-ceder-set', 'victorias-tres-horas', 'victorias-moqueta'].includes(id)) return won;
    if (id === 'sets-seis-cero') return sets.some(set => set[side] === 6 && set[1-side] === 0);
    if (id === 'sets-ajustados-ganados') return sets.some(set => set[side] > set[1-side] && set[side] - set[1-side] <= 2);
    if (id === 'conservar-primer-set') return sets[0][side] > sets[0][1-side];
    if (id === 'recuperar-primer-set') return sets[0][side] < sets[0][1-side];
    if (id === 'recuperar-dos-sets') return sets.length >= 3 && sets.slice(0,2).every(set => set[side] < set[1-side]);
    if (id === 'efectividad-decisivos') return isDeciding(match);
    if (id === 'efectividad-tiebreaks') return sets.some((_, index) => isRecordedTiebreak(match, index));
    const own = side === 0 ? match.context?.rank1 : match.context?.rank2;
    const opponent = side === 0 ? match.context?.rank2 : match.context?.rank1;
    if (id === 'efectividad-top-10') return !!opponent && opponent > 0 && opponent <= 10;
    if (id === 'efectividad-peor-ranking') return !!own && !!opponent && own > opponent;
    return true;
  });
}
