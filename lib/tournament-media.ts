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

const championPhotos: Record<string, TournamentEditionMedia['trophy']> = {
  'Australian Open|2026': {src:'/images/tournaments/australian-open/2026/champion.webp',alt:'Carlos Alcaraz con el trofeo del Abierto de Australia 2026',credit:'ANSA · Sky Sport',source:'https://sport.sky.it/tennis/2026/02/02/alcaraz-trofeo-australian-open-2026-foto',license:'Fuente editorial',licenseUrl:'https://sport.sky.it/tennis/2026/02/02/alcaraz-trofeo-australian-open-2026-foto',width:1218,height:640,objectPosition:'50% 35%'},
  'Australian Open|2025': {src:'/images/tournaments/australian-open/2025/champion.webp',alt:'Jannik Sinner con el trofeo del Abierto de Australia 2025',credit:'Chu Chen · Xinhua',source:'https://www.xinhuanet.com/sports/20250127/8c5ddaca863f4cb3845ca167cda7bfff/c.html',license:'Fuente editorial',licenseUrl:'https://www.xinhuanet.com/sports/20250127/8c5ddaca863f4cb3845ca167cda7bfff/c.html',width:1024,height:732,objectPosition:'50% 24%'},
  'Australian Open|2024': {src:'/images/tournaments/australian-open/2024/champion.webp',alt:'Jannik Sinner junto al trofeo del Abierto de Australia 2024',credit:'Ma Ping · Xinhua',source:'https://news.cnhubei.com/content/2024-01/28/content_17338274.html',license:'Fuente editorial',licenseUrl:'https://news.cnhubei.com/content/2024-01/28/content_17338274.html',width:999,height:512,objectPosition:'50% 45%'},
  'Australian Open|2023': {src:'/images/tournaments/australian-open/2023/champion.webp',alt:'Novak Djokovic con el trofeo del Abierto de Australia 2023',credit:'Sportskeeda',source:'https://www.sportskeeda.com/tennis/news-in-pictures-novak-djokovic-dazzles-10th-australian-open-trophy-post-win-photoshoot',license:'Fuente editorial',licenseUrl:'https://www.sportskeeda.com/tennis/news-in-pictures-novak-djokovic-dazzles-10th-australian-open-trophy-post-win-photoshoot',width:1400,height:933,objectPosition:'50% 30%'},
};

export function championPhotoForEdition(tournament: string, year: number) {
  return championPhotos[`${tournament}|${year}`] || mediaForEdition(tournament,year)?.trophy || null;
}

export function mediaForEdition(tournament: string, year: number) {
  return tournamentEditionMedia.find(item => item.tournament === tournament && item.year === year) || null;
}

export function latestMediaForTournament(tournament: string, years?: number[]) {
  return tournamentEditionMedia
    .filter(item => item.tournament === tournament && (!years || years.includes(item.year)))
    .sort((a,b) => b.year-a.year)[0] || null;
}
