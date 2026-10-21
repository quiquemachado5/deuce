import type { TournamentEntry } from "./tournament-directory";

/** Circuit order is presentation, not an inferred match date. */
const circuit = [
  "Australian Open",
  "Indian Wells",
  "Miami",
  "Monte Carlo",
  "Madrid",
  "Rome",
  "Roland Garros",
  "Wimbledon",
  "Canada",
  "Cincinnati",
  "US Open",
  "Shanghai",
  "Paris",
];
const slots = [1, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 7, 8.1, 8.2, 9, 10, 11];

export function calendarPosition(entry: TournamentEntry): number {
  const months = entry.matches
    .filter((match) => match.year === entry.latestYear)
    .flatMap((match) => {
      const date = match.context?.date;
      const parts = date?.match(/^\d{4}-(\d{2})-(\d{2})/);
      return parts &&
        Number(parts[1]) >= 1 &&
        Number(parts[1]) <= 12 &&
        Number(parts[2]) >= 1 &&
        Number(parts[2]) <= 31
        ? [Number(parts[1]) + Number(parts[2]) / 100]
        : [];
    });
  if (months.length) return Math.min(...months);
  const canonical = circuit.indexOf(entry.name);
  return canonical >= 0 ? slots[canonical] : 13;
}

export function calendarOrder(entries: TournamentEntry[]) {
  return [...entries].sort(
    (a, b) =>
      calendarPosition(a) - calendarPosition(b) ||
      a.name.localeCompare(b.name, "es"),
  );
}
