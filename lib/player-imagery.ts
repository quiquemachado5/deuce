import cached from './player-photo-manifest.json'
import refreshed from './player-photo-refresh.json'
import documented from './player-photo-additions.json'
import directory from './player-directory-photo-manifest.json'
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
    objectPosition: '50% 40%',
    mobileObjectPosition: '50% 38%',
  },
}

// The directory gives its largest slots to a small set of familiar players.
// These documented, higher-resolution moments avoid stretching their compact
// profile portraits while keeping the same archive-led photographic language.
export const directoryPlayerPhotos: Record<string, Photo> = {
  'Novak Djokovic': {
    src: '/images/editorial/champions/novak-djokovic-wimbledon-2019.webp',
    alt: 'Novak Djokovic levanta el trofeo de Wimbledon 2019',
    credit: 'Peter Menzel · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Novak_Djokovic_Trophy_Wimbledon_2019_-edited.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2019,
    objectPosition: '50% 32%',
    mobileObjectPosition: '50% 28%',
  },
  'Rafael Nadal': curated['Rafael Nadal'],
  'Roger Federer': {
    src: '/images/editorial/records/roger-federer-wimbledon-2005.webp',
    alt: 'Roger Federer saluda al público sobre la hierba de Wimbledon 2005',
    credit: 'Derek Holtham · CC BY-SA 3.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:Roger_Federer_at_Wimbledon_2005.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    photoYear: 2005,
    objectPosition: '50% 25%',
    mobileObjectPosition: '50% 22%',
  },
  'Andy Murray': {
    src: '/images/editorial/records/andy-murray-wimbledon-2013.webp',
    alt: 'Andy Murray celebra con el trofeo de Wimbledon 2013',
    credit: 'Robbie Dale · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Murray_and_the_Wimbledon_Trophy.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2013,
    objectPosition: '50% 32%',
    mobileObjectPosition: '52% 25%',
  },
  'Carlos Alcaraz': {
    src: '/images/editorial/champions/carlos-alcaraz-wimbledon-2023.webp',
    alt: 'Carlos Alcaraz levanta el trofeo de Wimbledon 2023',
    credit: 'Daniel Cooper · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Carlos_Alcaraz_Wimbledon_2023_Gentlemen%27s_Singles_Trophy.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2023,
    objectPosition: '50% 27%',
    mobileObjectPosition: '50% 21%',
  },
  'Jannik Sinner': {
    src: '/images/editorial/champions/jannik-sinner-wimbledon-2026.webp',
    alt: 'Jannik Sinner sostiene el trofeo de Wimbledon 2026',
    credit: 'Daniel Cooper · CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Jannik_Sinner_Wimbledon_2026_trophy_(cropped).jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    photoYear: 2026,
    objectPosition: '50% 27%',
    mobileObjectPosition: '50% 22%',
  },
  ...(directory as Record<string, Photo>),
}

export function playerDirectoryPhoto(name: string): Photo | null {
  return directoryPlayerPhotos[name] || playerPhoto(name)
}

// These final overrides favour the moment over the portrait: play, ceremony and
// trophy photographs have enough room to survive both landscape and mobile crops.
export const editorialPlayerPhotos: Record<string, Photo> = {
  'Roger Federer': {
    src: '/images/editorial/champions/roger-federer-wimbledon-2006.webp',
    thumbnail: '/images/players/optimized/roger-federer-small.webp',
    alt: 'Roger Federer recorre la pista con el trofeo de Wimbledon 2006',
    credit: 'Georgio · CC BY 2.0 · recorte editorial DEUCE',
    source: 'https://commons.wikimedia.org/wiki/File:Federer_Nadal_trophy_presentation_2006_cropped.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    photoYear: 2006,
    objectPosition: '50% 35%',
    mobileObjectPosition: '50% 30%',
  },
  'Björn Borg': {
    src: '/images/players/editorial/bjorn-borg-action.webp',
    thumbnail: '/images/players/documented/bjorn-borg-small.webp',
    alt: 'Björn Borg golpea de revés durante un partido en 1979',
    credit: 'Rob Croes · Anefo · CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Bj%C3%B6rn_Borg_in_aktie,_Bestanddeelnr_930-2090.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    photoYear: 1979,
    objectPosition: '53% 38%',
    mobileObjectPosition: '51% 34%',
  },
  'Jimmy Connors': {
    src: '/images/players/editorial/jimmy-connors-action.webp',
    thumbnail: '/images/players/optimized/jimmy-connors-small.webp',
    alt: 'Jimmy Connors en acción durante el torneo de Rotterdam de 1981',
    credit: 'Rob C. Croes · Anefo · CC0',
    source: 'https://commons.wikimedia.org/wiki/File:ABN_tennistoernooi_in_Ahoy_te_Rotterdam,_Jimmy_Conners_aktie_tegen_Wilkison,_Bestanddeelnr_931-3783.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    photoYear: 1981,
    objectPosition: '58% 36%',
    mobileObjectPosition: '56% 31%',
  },
  'Andre Agassi': {
    src: '/images/players/editorial/andre-agassi-action.webp',
    thumbnail: '/images/players/optimized/andre-agassi-small.webp',
    alt: 'Andre Agassi ejecuta un saque durante el US Clay Court Championship de 2005',
    credit: 'Chris Josefy · CC BY-SA 2.5',
    source: 'https://commons.wikimedia.org/wiki/File:Andre_Agassi_2005_US_Clay_Court_Serve.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5/',
    photoYear: 2005,
    objectPosition: '50% 36%',
    mobileObjectPosition: '49% 31%',
  },
  'Ivan Lendl': {
    src: '/images/players/editorial/ivan-lendl-action.webp',
    thumbnail: '/images/players/optimized/ivan-lendl-small.webp',
    alt: 'Ivan Lendl en acción durante la final del torneo de Rotterdam de 1984',
    credit: 'Rob C. Croes · Anefo · CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Finale_ABN_Tennistoernooi_Rotterdam_Lendl_in_actie,_Bestanddeelnr_932-9002.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    photoYear: 1984,
    objectPosition: '49% 28%',
    mobileObjectPosition: '50% 24%',
  },
  'John McEnroe': {
    src: '/images/players/editorial/john-mcenroe-action.webp',
    thumbnail: '/images/players/optimized/john-mcenroe-small.webp',
    alt: 'John McEnroe juega un punto en 1979',
    credit: 'Rob Croes · Anefo · CC0',
    source: 'https://commons.wikimedia.org/wiki/File:McEnroe_in_aktie,_Bestanddeelnr_930-2093.jpg',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    photoYear: 1979,
    objectPosition: '55% 37%',
    mobileObjectPosition: '55% 32%',
  },
  'Mats Wilander': {
    src: '/images/players/editorial/mats-wilander-action.webp',
    thumbnail: '/images/players/optimized/mats-wilander-small.webp',
    alt: 'Mats Wilander juega durante el Abierto de Estados Unidos',
    credit: 'Robbie Mendelson · CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Mats_Wilander_at_the_2010_US_Open_01.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    photoYear: 2010,
    objectPosition: '50% 27%',
    mobileObjectPosition: '50% 23%',
  },
  'Boris Becker': {
    src: '/images/players/editorial/boris-becker-action.webp',
    thumbnail: '/images/players/optimized/boris-becker-small.webp',
    alt: 'Boris Becker se prepara para devolver una pelota durante un partido',
    credit: 'James Phelps · CC BY 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Boris_Becker_in_action.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    objectPosition: '48% 38%',
    mobileObjectPosition: '50% 32%',
  },
  'Stefan Edberg': {
    src: '/images/players/editorial/stefan-edberg-action.webp',
    thumbnail: '/images/players/optimized/stefan-edberg-small.webp',
    alt: 'Stefan Edberg juega en la pista de Båstad',
    credit: 'Michael Erhardsson · CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Stefan_Edberg_B%C3%A5stad_sweden_20070708.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    photoYear: 2007,
    objectPosition: '50% 36%',
    mobileObjectPosition: '50% 31%',
  },
}

export const playerPhotos: Record<string, Photo> = { ...(cached as Record<string, Photo>), ...curated, ...(refreshed as Record<string, Photo>), ...(documented as Record<string, Photo>), ...editorialPlayerPhotos }

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
  const focus = playerPhotoFocus[name]
  return {
    ...photo,
    ...(focus && !photo.src.includes("/refreshed/") ? {
      objectPosition: photo.objectPosition || focus.objectPosition,
      avatarCrop: photo.avatarCrop || focus.avatarCrop,
    } : {}),
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
