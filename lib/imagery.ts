export type Photo = { src: string; thumbnail?: string; alt: string; credit: string; source: string; caption?: string; licenseUrl?: string; photoYear?: number; objectPosition?: string; avatarCrop?: {x: number; y: number; width: number; height: number} }
const commons = 'https://commons.wikimedia.org/wiki/File:'
export const courtPhotos: Record<string, Photo> = {
  'Indian Wells': { src: '/images/courts/indian-wells.jpg', alt: 'Pista principal del Indian Wells Tennis Garden', credit: 'IvanAndreevich · CC BY 3.0', source: commons + 'Indian_Wells_Tennis_Garden,_Stadium_1_(cropped).jpg' },
  'Miami': { photoYear: 2025, caption: 'Miami Open · Hard Rock Stadium · 2025', src: '/images/courts/miami-2025.jpg', alt: 'Taylor Fritz en el Miami Open 2025, celebrado en Hard Rock Stadium', credit: 'Vbrunophotog · CC BY-SA 4.0', source: commons + 'Taylor_Fritz_at_2025_Miami_Open_01.jpg', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  'Monte Carlo': { src: '/images/courts/monte-carlo.jpg', alt: 'Pistas del Masters de Montecarlo', credit: 'Domaina · CC BY-SA 3.0', source: commons + 'Terrains_Monte-Carlo_Rolex_Masters_1000.JPG' },
  'Madrid': { src: '/images/courts/madrid.jpg', alt: 'Pista central de la Caja Mágica de Madrid', credit: 'JC · CC BY-SA 2.0', source: commons + 'Madrid_Open_Center_Court_-_Caja_Magique_with_retractable_roof_(2)_(3622886860).jpg' },
  'Rome': { src: '/images/courts/rome.jpg', alt: 'Pista central del Foro Itálico de Roma', credit: 'Itto Ogami · CC BY 3.0', source: commons + 'Foro_Italico_–_Central_Tennis_Court.jpg' },
  'Canada': { caption: 'Montreal · alterna con Toronto', src: '/images/courts/canada.jpg', alt: 'Estadio de tenis de Montreal, sede del Masters de Canadá', credit: 'Jp Valery jpvalery · CC0', source: commons + 'Uniprix_Stadium,_Montreal,_Canada_(Unsplash_59RO7TskIOk).jpg' },
  'Cincinnati': { photoYear: 2025, caption:'Lindner Family Tennis Center · fotografía de 2025', src: '/images/courts/cincinnati.jpg', alt: 'Pista central del Cincinnati Open', credit: 'RandyFitz · CC0', source: commons + 'Lindner_Family_Tennis_Center_2025.jpg' },
  'Paris': { photoYear: 2024, caption: 'Bercy · fotografía de 2024', src: '/images/courts/paris.jpg', alt: 'Pista del Masters de París en la sede de 2024', credit: 'Chabe01 · CC BY-SA 4.0', source: commons + 'Tournoi_Paris_2024_Tennis_Palais_Omnisports_Paris_Bercy_-_Paris_XII_(FR75)_-_2024-10-30_-_1.jpg' },
  'Shanghai': { caption: 'Qizhong · exterior del estadio', src: '/images/courts/shanghai.jpg', alt: 'Exterior del estadio de tenis de Shanghái', credit: 'Curt Smith from Bellevue, WA, USA · CC BY 2.0', source: commons + 'Qizhong_Stadium.jpg' },
  'Australian Open': { photoYear: 2023, caption:'Rod Laver Arena · fotografía de 2023', src: '/images/courts/australian-open.jpg', alt: 'Rod Laver Arena durante el Abierto de Australia', credit: 'Gracchus250 · CC BY-SA 4.0', source: commons + 'Rod_Laver_Arena_Melbourne_Park_Australian_Open_2023_first_round.jpg' },
  'Roland Garros': { photoYear: 2024, caption:'Philippe-Chatrier · fotografía de 2024', src: '/images/courts/roland-garros.jpg', alt: 'Pista Philippe Chatrier en Roland Garros', credit: 'MFonzatti · CC BY-SA 4.0', source: commons + 'Court_Philippe_Chatrier_2024.jpg' },
  'Wimbledon': { src: '/images/courts/wimbledon.jpg', alt: 'Pista central de Wimbledon', credit: 'Arne Müseler · CC BY-SA 3.0 de', source: commons + 'Uk_london_Centre_Court_Wimbledon.jpg' },
  'US Open': { photoYear: 2018, caption:'Arthur Ashe · fotografía de 2018', src: '/images/courts/us-open.jpg', alt: 'Estadio Arthur Ashe en el Abierto de Estados Unidos', credit: 'Whoisjohngalt · CC BY-SA 4.0', source: commons + 'Arthur_Ashe_Stadium_in_2018.jpg' },
}
export function courtPhoto(tournament: string) { return courtPhotos[tournament] || null }
export function courtPhotoForEdition(tournament: string, year: number) {
  const photo = courtPhoto(tournament)
  return photo?.photoYear === year ? photo : null
}
