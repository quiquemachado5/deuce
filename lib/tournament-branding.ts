export type TournamentBranding = {
  src: string;
  source: string;
  trophySrc?: string;
  surface?: 'dark'|'light';
  circuitFallback?:boolean;
  monochrome?:boolean;
};

// Local editorial copies of marks published by each tournament. Keeping the
// source beside the asset makes provenance reviewable and avoids remote image
// requests from player profile pages.
const tournamentBranding: Record<string, TournamentBranding> = {
  Vienna:{src:'/images/tournament-logos/vienna-official.webp',source:'https://www.erstebank-open.com/en/'},
  Dubai:{src:'/images/tournament-logos/dubai-official.webp',source:'https://dubaidutyfreetennischampionships.com/',surface:'dark'},
  Beijing:{src:'/images/tournament-logos/beijing-official.webp',source:'https://www.chinaopen.com/',surface:'dark'},
  Stuttgart:{src:'/images/tournament-logos/stuttgart-official.webp',source:'https://www.bossopen.com/'},
  Mallorca:{src:'/images/tournament-logos/mallorca.webp',source:'https://www.mallorca-championships.com/'},
  Gstaad:{src:'/images/tournament-logos/gstaad.webp',source:'https://swissopengstaad.ch/'},
  Estoril:{src:'/images/tournament-logos/estoril.webp',source:'https://www.millenniumestorilopen.com/'},
  'Winston-Salem':{src:'/images/tournament-logos/winston-salem.webp',source:'https://www.winstonsalemopen.com/'},
  'Australian Open': {
    src: '/images/tournament-logos/ao-transparent.svg',
    monochrome: true,
    source: 'https://ausopen.com/',
    trophySrc: '/images/tournament-logos/australian-open.svg?v=deuce-trophy',
  },
  'Roland Garros': {
    src: '/images/tournament-logos/roland-garros-official.svg?v=official-colour',
    source: 'https://www.rolandgarros.com/',
    trophySrc: '/images/tournament-logos/roland-garros.svg?v=deuce-trophy',
  },
  Wimbledon: {
    src: '/images/tournament-logos/wimbledon-official.svg',
    source: 'https://www.wimbledon.com/',
    trophySrc: '/images/tournament-logos/wimbledon.svg?v=deuce-trophy',
  },
  'US Open': {
    src: '/images/tournament-logos/us-open-transparent.svg',
    source: 'https://www.usopen.org/',
    trophySrc: '/images/tournament-logos/us-open.svg?v=deuce-trophy',
  },
  'Indian Wells': {
    src: '/images/tournament-logos/indian-wells.webp',
    source: 'https://bnpparibasopen.com/',
  },
  Miami: {
    src: '/images/tournament-logos/miami.webp',
    source: 'https://www.miamiopen.com/',
  },
  'Monte Carlo': {
    src: '/images/tournament-logos/monte-carlo.webp',
    source: 'https://montecarlotennismasters.com/',
  },
  Madrid: {
    src: '/images/tournament-logos/madrid.webp',
    source: 'https://mutuamadridopen.com/',
  },
  Rome: {
    src: '/images/tournament-logos/rome.webp',
    source: 'https://internazionalibnlditalia.com/',
  },
  Canada: {
    src: '/images/tournament-logos/canada.webp',
    source: 'https://nationalbankopen.com/',
  },
  Cincinnati: {
    src: '/images/tournament-logos/cincinnati.webp',
    source: 'https://cincinnatiopen.com/our-brand/',
  },
  Paris: {
    src: '/images/tournament-logos/paris.webp',
    source: 'https://www.rolexparismasters.com/',
    surface: 'dark',
  },
  Shanghai: {
    src: '/images/tournament-logos/shanghai.svg',
    source: 'https://en.rolexshanghaimasters.com/',
  },
  Barcelona: {
    src: '/images/tournament-logos/barcelona.webp',
    source: 'https://www.barcelona-open.com/media/',
  },
  Bastad: {
    src: '/images/tournament-logos/bastad.webp',
    source: 'https://nordeaopen.se/press-media/',
  },
  Brisbane: {
    src: '/images/tournament-logos/brisbane.webp',
    source: 'https://www.tennis.com.au/content/dam/tennisaustralia/tennis-topic/sot/brisbane/documents/terms-and-conditions/updated/bi2026-ticket-conditions-of-sale-and-entry.pdf',
  },
  Acapulco: {
    src: '/images/tournament-logos/acapulco.svg',
    source: 'https://abiertomexicanodetenis.com/',
  },
  Hamburg: {
    src: '/images/tournament-logos/hamburg.svg',
    source: 'https://hamburgopenatp500.com/',
  },
  'Hamburg Masters': {
    src: '/images/tournament-logos/hamburg.svg',
    source: 'https://hamburgopenatp500.com/',
  },
};

export function tournamentBrandingFor(name: string) {
  const aliases:Record<string,string>={'Abierto de Australia':'Australian Open','Abierto de Estados Unidos':'US Open',Montecarlo:'Monte Carlo',Roma:'Rome','Canadá':'Canada','Shanghái':'Shanghai','París':'Paris',Tokio:'Tokyo',Viena:'Vienna',Pekín:'Beijing','Pekín (China Open)':'Beijing'};
  return tournamentBranding[aliases[name]||name] || null;
}

/** Unavailable historical event marks use the official circuit mark, never an invented tournament logo. */
export function tournamentMarkFor(name:string,tour:'atp'|'wta'='atp'):TournamentBranding {
  const major=['Australian Open','Roland Garros','Wimbledon','US Open','Abierto de Australia','Abierto de Estados Unidos'].includes(name);
  return (major?tournamentBrandingFor(name):null)||{src:(tour==='wta'?'/images/tournament-logos/wta-official.svg':'/images/tournament-logos/atp-official.svg'),source:tour==='wta'?'https://www.wtatennis.com/':'https://www.atptour.com/',surface:'light',circuitFallback:true,monochrome:true};
}

export const tournamentBrandCredits=[...Object.entries(tournamentBranding).map(([name,brand])=>({name:`Logo · ${name}`,photo:{src:brand.src,alt:`Marca oficial de ${name}`,credit:'Marca del torneo · fuente oficial',source:brand.source}})),...(['atp','wta'] as const).map(tour=>({name:`Logo · ${tour.toUpperCase()}`,photo:{src:(tour==='wta'?'/images/tournament-logos/wta-official.svg':'/images/tournament-logos/atp-official.svg'),alt:`Marca oficial ${tour.toUpperCase()}`,credit:'Marca del circuito · fuente oficial',source:tour==='atp'?'https://commons.wikimedia.org/wiki/File:ATP_Tour_logo.svg':'https://www.wtatennis.com/'}}))];
