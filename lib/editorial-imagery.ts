import type { Photo } from './imagery';
import { playerPhoto } from './player-imagery';

export const recordPhotos: Record<string, Photo> = {
  'mas-juegos': {
    src: '/images/editorial/records/isner-mahut-2010.webp',
    alt: 'John Isner y Nicolas Mahut junto al marcador de 70 a 68 de Wimbledon 2010',
    credit: 'Wikimedia Commons',
    source: 'https://commons.wikimedia.org/wiki/File:Wimbledon_Isner_Mahut_Longest_Match.jpg',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Wimbledon_Isner_Mahut_Longest_Match.jpg',
    photoYear: 2010,
    objectPosition: '50% 50%',
    mobileObjectPosition: '53% 50%',
  },
  'remontada-dos-sets': {
    src: '/images/editorial/records/andy-murray-wimbledon-2013.webp',
    alt: 'Andy Murray celebra con el trofeo de Wimbledon 2013',
    credit: 'Robbie Dale · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Murray_and_the_Wimbledon_Trophy.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2013,
    objectPosition: '50% 32%',
    mobileObjectPosition: '52% 25%',
  },
  'titulos-grass': {
    src: '/images/editorial/records/roger-federer-wimbledon-2005.webp',
    alt: 'Roger Federer saluda al público sobre la hierba de Wimbledon 2005',
    credit: 'Derek Holtham · CC BY-SA 3.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:Roger_Federer_at_Wimbledon_2005.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    photoYear: 2005,
    objectPosition: '50% 27%',
    mobileObjectPosition: '50% 24%',
  },
  'efectividad-clay': {
    src: '/images/editorial/champions/rafael-nadal-roland-garros-2006.webp',
    alt: 'Rafael Nadal levanta la Copa de los Mosqueteros en Roland Garros 2006',
    credit: 'Sylvain Weber · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Rafael_Nadal_at_the_2006_French_Open.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2006,
    objectPosition: '50% 35%',
    mobileObjectPosition: '52% 32%',
  },
  'atp-500-victorias': {
    src: '/images/editorial/records/alex-de-minaur-rosmalen-2024.webp',
    alt: 'Alex De Minaur preparado para restar en la hierba de Rosmalen 2024',
    credit: 'Tvx1 · CC BY-SA 4.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:De_Minaur_Rosmalen.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    photoYear: 2024,
    objectPosition: '50% 31%',
    mobileObjectPosition: '50% 28%',
  },
  winners: {
    src: '/images/editorial/records/alexander-zverev-citi-open-2018.webp',
    alt: 'Alexander Zverev golpea de revés en la final de Washington 2018',
    credit: 'Keith Allison · CC BY-SA 2.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:Alexander_Zverev_%2828939003227%29_%28cropped%29.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2018,
    objectPosition: '50% 28%',
    mobileObjectPosition: '50% 24%',
  },
};

export function recordPhoto(recordId: string, playerName: string): Photo | null {
  return recordPhotos[recordId] || playerPhoto(playerName);
}
