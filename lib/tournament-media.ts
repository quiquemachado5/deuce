export type TournamentEditionMedia = {
  tournament: string;
  year: number;
  video: {
    youtubeId: string;
    title: string;
    channel: string;
    source: string;
    verifiedAt: string;
  };
  trophy: {
    src: string;
    alt: string;
    credit: string;
    source: string;
    license: string;
    licenseUrl: string;
    width: number;
    height: number;
    objectPosition: string;
  };
};

export const tournamentEditionMedia: TournamentEditionMedia[] = [{
  tournament: "Roland Garros",
  year: 2024,
  video: {
    youtubeId: "TlYHfLa4TcQ",
    title: "Final masculina 2024: Alcaraz contra Zverev",
    channel: "Roland-Garros",
    source: "https://www.youtube.com/watch?v=TlYHfLa4TcQ",
    verifiedAt: "2026-10-26",
  },
  trophy: {
    src: "/images/tournaments/roland-garros/2024/trophy.jpg",
    alt: "Carlos Alcaraz con la Copa de los Mosqueteros en Roland Garros 2024",
    credit: "Vegafi",
    source: "https://commons.wikimedia.org/wiki/File:Carlos_Alcaraz_-_Vainqueur_Roland_Garros_2024.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    width: 1493,
    height: 995,
    objectPosition: "50% 28%",
  },
}];

export function mediaForEdition(tournament: string, year: number) {
  return tournamentEditionMedia.find(item => item.tournament === tournament && item.year === year) || null;
}

export function latestMediaForTournament(tournament: string, years?: number[]) {
  return tournamentEditionMedia
    .filter(item => item.tournament === tournament && (!years || years.includes(item.year)))
    .sort((a,b) => b.year-a.year)[0] || null;
}
