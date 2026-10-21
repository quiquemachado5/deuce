import type { Match } from "./types";

// The source occasionally assigns implausible elapsed minutes to a completed
// match. Keep those rows in the archive, but exclude the field from all
// duration comparisons so a transcription error cannot lead a record list.
export const MAX_PUBLISHED_MATCH_MINUTES = 12 * 60;

export function publishedMatchMinutes(match: Match): number | null {
  const minutes = match.context?.minutes;
  return typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes > 0 &&
    minutes <= MAX_PUBLISHED_MATCH_MINUTES
    ? minutes
    : null;
}
