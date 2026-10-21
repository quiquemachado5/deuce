import cached from './player-photo-manifest.json'
import type { Photo } from './imagery'

const commons = 'https://commons.wikimedia.org/wiki/File:'
const curated: Record<string, Photo> = {
  'Alexander Zverev': { src: '/images/players/optimized/alexander-zverev.webp', alt: 'Alexander Zverev', credit: 'Rick Munroe · CC BY-SA 4.0', source: commons + 'Alexander_Zverev.jpg' },
  'Alex De Minaur': { src: '/images/players/optimized/alex-de-minaur.webp', alt: 'Alex de Minaur', credit: 'Tvx1 · CC BY-SA 4.0', source: commons + 'De_Minaur_Rosmalen_(cropped2).jpg' },
  'Carlos Alcaraz': { src: '/images/players/optimized/carlos-alcaraz.webp', alt: 'Carlos Alcaraz', credit: 'OMAR.ERRE · CC BY 4.0', source: commons + 'Carlos_Alcaraz_Argentina_Open_2024.jpg' },
  'Jannik Sinner': { src: '/images/players/optimized/jannik-sinner.webp', alt: 'Jannik Sinner', credit: 'Hameltion · CC BY-SA 4.0', source: commons + 'Jannik_Sinner_(2024_US_Open)_04_(cropped).jpg' },
  'Novak Djokovic': { src: '/images/players/optimized/novak-djokovic.webp', alt: 'Novak Djokovic', credit: 'Partynia · CC BY-SA 4.0', source: commons + 'Novak_Djoković_French_Open_2023_(cropped).jpg' },
  'Rafael Nadal': { src: '/images/players/optimized/rafael-nadal-2022.webp', alt: 'Rafael Nadal sacando en el Abierto de Estados Unidos de 2022', credit: '350z33 · CC BY-SA 4.0', source: commons + 'RafaelNadal2022USOpen_(cropped).jpg' },
}

export const playerPhotos: Record<string, Photo> = { ...(cached as Record<string, Photo>), ...curated }
const normalizedPhotos = new Map(Object.entries(playerPhotos).map(([name, photo]) => [name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/-/g, ' '), photo]))
export function playerPhoto(name: string): Photo | null { const photo = playerPhotos[name] || normalizedPhotos.get(name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/-/g, ' ')); return photo ? { ...photo, thumbnail: photo.src.includes('/optimized/') ? photo.src.replace('.webp', '-small.webp') : photo.src } : null }
