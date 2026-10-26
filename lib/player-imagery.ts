import cached from './player-photo-manifest.json'
import refreshed from './player-photo-refresh.json'
import documented from './player-photo-additions.json'
import type { Photo } from './imagery'
import { playerPhotoFocus } from './player-photo-focus'

// Curated replacements must carry the source and licence of that exact image.
const curated: Record<string, Photo> = {
  'Novak Djokovic': {
    src: '/images/players/optimized/novak-djokovic.webp',
    alt: 'Novak Djokovic en el Miami Open 2025',
    credit: 'Vbrunophotog · adaptación WebP por DEUCE · CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Novak_Djokovic_at_2025_Miami_Open_(cropped).jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'Rafael Nadal': {
    src: '/images/players/optimized/rafael-nadal-2022.webp',
    alt: 'Rafael Nadal al saque en el Abierto de Estados Unidos 2022',
    credit: '350z33 · adaptación WebP por DEUCE · CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:RafaelNadal2022USOpen_(cropped).jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
}

export const playerPhotos: Record<string, Photo> = { ...(cached as Record<string, Photo>), ...curated, ...(refreshed as Record<string, Photo>), ...(documented as Record<string, Photo>) }

function normalizeName(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’'‐‑‒–—-]/g, ' ').replace(/\s+/g, ' ').trim()
}

const normalizedPhotos = new Map(
  Object.entries(playerPhotos).map(([name, photo]) => [normalizeName(name), photo]),
)

export function playerPhoto(name: string): Photo | null {
  const photo = playerPhotos[name] || normalizedPhotos.get(normalizeName(name))
  if (!photo) return null
  return {
    ...photo,
    ...(['Roger Federer','Jimmy Connors'].includes(name) ? {licenseUrl:'https://creativecommons.org/licenses/by-sa/2.0/'} : ['Ivan Lendl','John McEnroe'].includes(name) ? {licenseUrl:'https://creativecommons.org/licenses/by/2.0/'} : {}),
    ...(photo.src.includes("/refreshed/") ? {} : playerPhotoFocus[name] || {}),
    thumbnail: photo.thumbnail || (photo.src.startsWith('/images/players/optimized/') && photo.src.endsWith('.webp')
      ? photo.src.replace(/\.webp$/, '-small.webp')
      : photo.src),
  }
}

const editionPhotoVariants: Record<string,string[]> = {
  'Carlos Alcaraz': ['/images/players/refreshed/carlos-alcaraz-379d5255.webp','/images/players/optimized/carlos-alcaraz.webp'],
  'Jannik Sinner': ['/images/players/jannik-sinner.jpg','/images/players/optimized/jannik-sinner.webp'],
  'Novak Djokovic': ['/images/players/novak-djokovic.jpg','/images/players/refreshed/novak-djokovic-692d5ed1.webp','/images/players/optimized/novak-djokovic.webp'],
  'Rafael Nadal': ['/images/players/optimized/rafael-nadal-2022.webp','/images/players/refreshed/rafael-nadal-70eb65d8.webp','/images/players/rafael-nadal.jpg','/images/players/optimized/rafael-nadal.webp'],
  'Roger Federer': ['/images/players/roger-federer.jpg','/images/players/optimized/roger-federer.webp'],
  'Andy Murray': ['/images/players/andy-murray.jpg','/images/players/optimized/andy-murray.webp'],
  'Stan Wawrinka': ['/images/players/stan-wawrinka.jpg','/images/players/optimized/stan-wawrinka.webp'],
};

export function playerEditionPhoto(name: string, occurrence: number): Photo | null {
  const base=playerPhoto(name);
  if(!base)return null;
  const variants=editionPhotoVariants[name];
  if(!variants?.[occurrence])return occurrence===0?base:null;
  return {...base,src:variants[occurrence],thumbnail:variants[occurrence]};
}
