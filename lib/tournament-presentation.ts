import type { Match, Surface } from "./types";

type CourtInput = {
  tournament: string;
  year: number;
  category?: string;
  surface?: Surface;
  indoor?: boolean | null;
  context?: { indoor?: boolean | null };
};

/** Venue condition is independent of the playing surface. Raw archive fields stay intact. */
export function tournamentCourt(input: CourtInput): {
  surface: Surface;
  indoor: boolean | null;
  corrected: boolean;
} {
  const surface = input.surface || "unknown";
  const indoor = input.indoor ?? input.context?.indoor ?? null;
  // Madrid Masters was indoor hard in 2002–08 and outdoor clay from 2009.
  // Do not apply this to unrelated historical Madrid events sharing the city name.
  // ATP: https://www.atptour.com/en/news/madrid-foundation-story-bespoke-2024
  if (
    input.tournament === "Madrid" &&
    input.category === "Masters 1000" &&
    input.year >= 2002
  ) {
    const knownSurface = input.year < 2009 ? "hard" : "clay";
    const knownIndoor = input.year < 2009;
    return {
      surface: knownSurface,
      indoor: knownIndoor,
      corrected: surface !== knownSurface,
    };
  }
  return { surface, indoor, corrected: false };
}

export function editionTournamentCourt(matches: Match[]) {
  const courts = matches.map(tournamentCourt);
  const surfaces = [...new Set(courts.map((court) => court.surface))];
  const conditions = [
    ...new Set(
      courts.map((court) => court.indoor).filter((indoor) => indoor !== null),
    ),
  ];
  return {
    surfaces,
    surface: surfaces.length === 1 ? surfaces[0] : ("unknown" as Surface),
    indoor: conditions.length === 1 ? conditions[0] : null,
    corrected: courts.some((court) => court.corrected),
  };
}

/** Card colour describes the latest registered edition, never every historical surface. */
export function latestTournamentCourt(matches: Match[]) {
  const year = Math.max(...matches.map((match) => match.year));
  return {
    ...editionTournamentCourt(matches.filter((match) => match.year === year)),
    year,
  };
}

export function tournamentSurfaceHistory(matches: Match[]) {
  const groups = new Map<Surface, { from: number; to: number }>();
  for (const match of matches) {
    const surface = tournamentCourt(match).surface;
    const prior = groups.get(surface);
    groups.set(surface, {
      from: Math.min(prior?.from ?? match.year, match.year),
      to: Math.max(prior?.to ?? match.year, match.year),
    });
  }
  return [...groups]
    .map(([surface, years]) => ({ surface, ...years }))
    .sort((a, b) => a.from - b.from);
}

/** Do not span undocumented years or collapse changes into a timeless surface. */
export function tournamentTimeline(matches: Match[]) {
  const years=[...new Set(matches.map(m=>m.year))].sort((a,b)=>a-b);
  const periods:{from:number;to:number;category:string;surface:Surface;indoor:boolean|null}[]=[];
  for(const year of years){
    const rows=matches.filter(m=>m.year===year);
    for(const category of [...new Set(rows.map(m=>m.category))]){
      const court=editionTournamentCourt(rows.filter(m=>m.category===category));
      const prior=periods.at(-1);
      if(prior&&prior.to===year-1&&prior.category===category&&prior.surface===court.surface&&prior.indoor===court.indoor)prior.to=year;
      else periods.push({from:year,to:year,category,surface:court.surface,indoor:court.indoor});
    }
  }
  return periods;
}
