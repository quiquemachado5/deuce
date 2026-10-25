import { searchText } from './search-text';
import type { Match } from './types';
import { roundPosition } from './editorial';

/** Explicit vocabulary only: numbers and names are never guessed. */
export function matchSearchIntent(query: string) {
  let text = searchText(query.slice(0, 180));
  const labels: string[] = [];
  const fiveSets = /\b(?:a |en )?(?:cinco|5) sets\b/.test(text);
  if (fiveSets) { text = text.replace(/\b(?:a |en )?(?:cinco|5) sets\b/g, ' '); labels.push('Cinco sets'); }
  let round: number | undefined;
  for (const [pattern, position, label] of [
    [/\bsemifinal(?:es)?\b/g, 6, 'Semifinales'], [/\bcuartos(?: de final)?\b/g, 5, 'Cuartos de final'],
    [/\boctavos(?: de final)?\b/g, 4, 'Octavos de final'], [/\bfinal(?:es)?\b/g, 7, 'Final'],
  ] as const) { if (pattern.test(text)) { round = position; text = text.replace(pattern, ' '); labels.push(label); break; } }
  let surface: Match['surface'] | undefined;
  for (const [pattern, value, label] of [
    [/\b(?:tierra(?: batida)?|arcilla|clay)\b/g, 'clay', 'Tierra batida'],
    [/\b(?:hierba|cesped|grass)\b/g, 'grass', 'Hierba'],
    [/\b(?:pista dura|dura|hard)\b/g, 'hard', 'Dura'], [/\b(?:moqueta|carpet)\b/g, 'carpet', 'Moqueta'],
  ] as const) { if (pattern.test(text)) { surface = value; text = text.replace(pattern, ' '); labels.push(label); break; } }
  const yearToken = text.match(/\b(?:19|20)\d{2}\b/)?.[0];
  const year = yearToken ? Number(yearToken) : undefined;
  if (yearToken) { text = text.replace(yearToken, ' '); labels.push(yearToken); }
  text = text.replace(/\bfrench open\b|\brg\b/g, 'roland garros').replace(/\bao\b/g, 'australian open')
    .replace(/\bee uu\b|\busopen\b/g, 'us open');
  const terms = text.split(/\s+/).filter(term => term && !['partido', 'partidos', 'contra', 'vs', 'versus', 'de', 'del', 'en', 'a', 'y'].includes(term));
  return { terms, year, round, surface, fiveSets, labels };
}

export function matchesIntent(match: Match, intent: ReturnType<typeof matchSearchIntent>) {
  return (!intent.year || match.year === intent.year) && (!intent.surface || match.surface === intent.surface)
    && (!intent.round || roundPosition(match.round) === intent.round)
    && (!intent.fiveSets || match.score_summary.games.length === 5);
}
