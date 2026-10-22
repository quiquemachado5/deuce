import cached from './player-photo-manifest.json'
import refreshed from './player-photo-refresh.json'
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

export const playerPhotos: Record<string, Photo> = { ...(cached as Record<string, Photo>), ...curated, ...(refreshed as Record<string, Photo>) }

function normalizeName(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’'‐‑‒–—-]/g, ' ').replace(/\s+/g, ' ').trim()
}

const normalizedPhotos = new Map(
  Object.entries(playerPhotos).map(([name, photo]) => [normalizeName(name), photo]),
)

// These archival crops do not remain legible at avatar or hero sizes. The UI
// deliberately falls back to high-contrast initials until a better licensed
// portrait is curated.
const initialsPreferred = new Set(['Jimmy Connors', 'Roger Federer', 'Ivan Lendl', 'John McEnroe'])

export function playerPhoto(name: string): Photo | null {
  if (initialsPreferred.has(name)) return null
  const photo = playerPhotos[name] || normalizedPhotos.get(normalizeName(name))
  if (!photo) return null
  return {
    ...photo,
    ...(photo.src.includes("/refreshed/") ? {} : playerPhotoFocus[name] || {}),
    thumbnail: photo.thumbnail || (photo.src.startsWith('/images/players/optimized/') && photo.src.endsWith('.webp')
      ? photo.src.replace(/\.webp$/, '-small.webp')
      : photo.src),
  }
}
