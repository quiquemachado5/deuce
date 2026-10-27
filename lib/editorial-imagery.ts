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
};

export function recordPhoto(recordId: string, playerName: string): Photo | null {
  return recordPhotos[recordId] || playerPhoto(playerName);
}
