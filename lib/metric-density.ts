import { matchStat, statNumber } from './archive-insights';
import type { Match } from './types';

export const densityFields: Record<string, { field: string; numerator: string; denominator: string }> = {
  'aces-per-100': { field: 'aceDensity', numerator: 'Aces', denominator: 'Service points played' },
  'faults-per-100': { field: 'faultDensity', numerator: 'Double Faults', denominator: 'Service points played' },
  'chances-per-100': { field: 'breakCreated', numerator: 'Break points played', denominator: 'Return games played' },
  'faced-per-100': { field: 'breakFaced', numerator: 'Break points faced', denominator: 'Service games played' },
};
export function hasDensityPair(match: Match, side: 1 | 2, key: string) {
  const fields = densityFields[key];
  return !!fields && statNumber(matchStat(match, side, fields.numerator)) !== null
    && (statNumber(matchStat(match, side, fields.denominator)) || 0) > 0;
}
