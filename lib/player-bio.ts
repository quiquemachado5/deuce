import index from './player-bio-index.json';
import wtaIndex from './wta-player-bio.json';
import { playerSlug } from './explore';
import { canonicalName } from './quality';
const wtaBySlug=new Map(Object.entries(wtaIndex as Record<string,PlayerBio>).map(([name,bio])=>[playerSlug(canonicalName(name)),bio]));

export type PlayerBio = {
  country?: string;
  birthday?: string;
  hand?: 'L' | 'R';
  backhand?: 1 | 2;
};

type RawPlayer = Record<string, unknown>;
type RawMatch = { players?: { p1?: RawPlayer; p2?: RawPlayer }; winner?:RawPlayer; loser?:RawPlayer };

function validBirthday(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value) ? value : undefined;
}

export function normalizedBio(player: RawPlayer): PlayerBio {
  const country = typeof player.country === 'string' && /^[a-z]{3}$/i.test(player.country) ? player.country.toLowerCase() : undefined;
  const birthday = validBirthday(player.birthday);
  const hand = player.hand === 'L' || player.hand === 'R' ? player.hand : undefined;
  const backhand = player.backhand === 1 || player.backhand === 2 ? player.backhand : undefined;
  return { ...(country && { country }), ...(birthday && { birthday }), ...(hand && { hand }), ...(backhand && { backhand }) };
}

export function mergeBio(base: PlayerBio | undefined, fresh: PlayerBio | undefined): PlayerBio | undefined {
  if (!base && !fresh) return undefined;
  return { ...fresh, ...Object.fromEntries(Object.entries(base || {}).filter(([, value]) => value !== undefined)) };
}

export function bioKey(name: string): string { return playerSlug(canonicalName(name)); }

/** Extract only provider biography fields; rankings in these rows are download-time values. */
export function collectPlayerBios(matches: RawMatch[]): Record<string, PlayerBio> {
  const people: Record<string, PlayerBio> = {};
  for (const match of matches) for (const player of [match.players?.p1, match.players?.p2,match.winner,match.loser]) {
    if (!player || typeof player.name !== 'string') continue;
    const key = bioKey(player.name);
    const bio = normalizedBio(player);
    if (Object.keys(bio).length) people[key] = mergeBio(people[key], bio)!;
  }
  return people;
}

const countries: Record<string, string> = {
  arg: 'Argentina', arm: 'Armenia', aus: 'Australia', aut: 'Austria', bel: 'Bélgica', bih: 'Bosnia y Herzegovina',
  blr: 'Bielorrusia', bol: 'Bolivia', bra: 'Brasil', bul: 'Bulgaria', can: 'Canadá', chi: 'Chile', chn: 'China',
  col: 'Colombia', cro: 'Croacia', cze: 'Chequia', den: 'Dinamarca', dom: 'República Dominicana', ecu: 'Ecuador',
  esp: 'España', spa: 'España', est: 'Estonia', fin: 'Finlandia', fra: 'Francia', gbr: 'Reino Unido', geo: 'Georgia',
  ger: 'Alemania', gre: 'Grecia', hkg: 'Hong Kong', hun: 'Hungría', ind: 'India', ita: 'Italia', jam: 'Jamaica',
  jpn: 'Japón', jor: 'Jordania', kaz: 'Kazajistán', kor: 'Corea del Sur', lbn: 'Líbano', lie: 'Liechtenstein',
  ltu: 'Lituania', lux: 'Luxemburgo', mar: 'Marruecos', mda: 'Moldavia', mex: 'México', mon: 'Mónaco',
  ned: 'Países Bajos', nmi: 'Islas Marianas del Norte', nor: 'Noruega', nzl: 'Nueva Zelanda', par: 'Paraguay',
  per: 'Perú', pol: 'Polonia', por: 'Portugal', rou: 'Rumanía', rsa: 'Sudáfrica', rus: 'Rusia', slo: 'Eslovenia',
  srb: 'Serbia', sui: 'Suiza', svk: 'Eslovaquia', swe: 'Suecia', tai: 'Taipéi Chino', tha: 'Tailandia',
  tun: 'Túnez', tur: 'Turquía', ukr: 'Ucrania', uru: 'Uruguay', usa: 'Estados Unidos', uzb: 'Uzbekistán',
  zim: 'Zimbabue',
};

export function countryLabel(code: string): string { return countries[code] || code.toUpperCase(); }
export function birthLabel(date: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
export function handLabel(hand: 'L' | 'R'): string { return hand === 'L' ? 'Zurdo' : 'Diestro'; }
export function backhandLabel(backhand: 1 | 2): string { return backhand === 1 ? 'A una mano' : 'A dos manos'; }

/** Read the compact provider-derived index without blocking a profile on a season blob. */
export function playerBiography(name: string): PlayerBio | undefined {
  const key = bioKey(name);
  return (index as Record<string, PlayerBio>)[key] || wtaBySlug.get(key);
}
