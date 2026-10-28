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
    src: '/images/editorial/champions/roger-federer-wimbledon-2006.webp',
    alt: 'Roger Federer recorre la pista con el trofeo de Wimbledon 2006',
    credit: 'Georgio · CC BY 2.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:Federer_Nadal_trophy_presentation_2006_cropped.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    photoYear: 2006,
    objectPosition: '50% 34%',
    mobileObjectPosition: '52% 31%',
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
    src: '/images/players/alex-de-minaur.jpg',
    alt: 'Alex De Minaur durante un torneo en 2024',
    credit: 'Barcex · CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Alex_de_Minaur_2024.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    photoYear: 2024,
    objectPosition: '50% 30%',
    mobileObjectPosition: '50% 26%',
  },
  winners: {
    src: '/images/players/alexander-zverev.jpg',
    alt: 'Alexander Zverev durante un partido',
    credit: 'Rick Munroe · CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Alexander_Zverev_%28cropped%29.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    objectPosition: '50% 34%',
    mobileObjectPosition: '50% 30%',
  },
};

export function recordPhoto(recordId: string, playerName: string): Photo | null {
  return recordPhotos[recordId] || playerPhoto(playerName);
}
