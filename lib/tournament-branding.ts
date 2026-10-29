export type TournamentBranding = {
  src: string;
  source: string;
  trophySrc?: string;
};

// Local editorial copies of marks published by each tournament. Keeping the
// source beside the asset makes provenance reviewable and avoids remote image
// requests from player profile pages.
const tournamentBranding: Record<string, TournamentBranding> = {
  'Australian Open': {
    src: '/images/tournament-logos/ao.webp',
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
    src: '/images/tournament-logos/usopen.webp',
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
  return tournamentBranding[name] || null;
}
