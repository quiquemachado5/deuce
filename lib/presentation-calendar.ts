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

/** Stable season order for a career table. Dates come from the latest documented
 * edition of the event, not from the last year this particular player attended. */
export function careerSeasonPosition(name:string,observedPosition?:number):number {
  const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const majors:Record<string,number>={'australian open':1,'abierto de australia':1,'roland garros':5.25,'wimbledon':6.25,'us open':8.25,'abierto de estados unidos':8.25};
  if(majors[key]!==undefined)return majors[key];
  if(observedPosition!==undefined&&Number.isFinite(observedPosition)&&observedPosition>0&&observedPosition<13)return observedPosition;
  const fallback:Record<string,number>={doha:2.1,dubai:2.2,'indian wells':3.1,miami:3.2,'monte carlo':4.1,montecarlo:4.1,madrid:4.2,rome:5.1,roma:5.1,canada:8.1,cincinnati:8.2,beijing:9.2,pekin:9.2,wuhan:10.1,shanghai:10.1,shangai:10.1,paris:11,'atp finals':11.2,'wta finals':11.2};
  return fallback[key]??13;
}
