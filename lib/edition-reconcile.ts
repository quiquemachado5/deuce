import type { Match } from './types';
import { eligibleMatch, prepareMatch } from './quality';

/** A valid saved detail can recover a list result that has not been restated yet. */
export function reconcileEditionSummaries(summaries: Match[], details: Match[]): Match[] {
  const validDetails = new Map(details.filter((row) => eligibleMatch(prepareMatch(row))).map((row) => [row.match_id, row]));
  return summaries.map((row) => validDetails.get(row.match_id) || row);
}
