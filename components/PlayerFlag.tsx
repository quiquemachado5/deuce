import Image from 'next/image';

/** Provider country codes only. Local SVGs: lipis/flag-icons, MIT. */
const countryIso: Record<string, string> = {
  and: 'ad', bdi: 'bi', cyp: 'cy', egy: 'eg', ina: 'id', isr: 'il', lat: 'lv', mkd: 'mk', mlt: 'mt', mne: 'me', phi: 'ph', pur: 'pr', tpe: 'tw',
  alg: 'dz', bah: 'bs', bar: 'bb', civ: 'ci', crc: 'cr', cub: 'cu', hai: 'ht', iri: 'ir', irl: 'ie', ken: 'ke', ngr: 'ng', pak: 'pk', qat: 'qa', sen: 'sn', ven: 've',
  arg: 'ar', arm: 'am', aus: 'au', aut: 'at', bel: 'be', bih: 'ba', blr: 'by',
  bol: 'bo', bra: 'br', bul: 'bg', can: 'ca', chi: 'cl', chn: 'cn', col: 'co',
  cro: 'hr', cze: 'cz', den: 'dk', dom: 'do', ecu: 'ec', esp: 'es', spa: 'es',
  est: 'ee', fin: 'fi', fra: 'fr', gbr: 'gb', geo: 'ge', ger: 'de', gre: 'gr',
  hkg: 'hk', hun: 'hu', ind: 'in', ita: 'it', jam: 'jm', jpn: 'jp', jor: 'jo',
  kaz: 'kz', kor: 'kr', lbn: 'lb', lie: 'li', ltu: 'lt', lux: 'lu', mar: 'ma',
  mda: 'md', mex: 'mx', mon: 'mc', ned: 'nl', nmi: 'mp', nor: 'no', nzl: 'nz',
  par: 'py', per: 'pe', pol: 'pl', por: 'pt', rou: 'ro', rsa: 'za', rus: 'ru',
  slo: 'si', srb: 'rs', sui: 'ch', svk: 'sk', swe: 'se', tai: 'tw', tha: 'th',
  tun: 'tn', tur: 'tr', ukr: 'ua', uru: 'uy', usa: 'us', uzb: 'uz', zim: 'zw',
};

// These ISO flags do not yet have a local SVG in the curated MIT bundle. Use
// the platform flag glyph rather than a broken image; historic/unknown codes
// remain deliberately neutral instead of being assigned to a successor state.
const emojiOnlyIso = new Set(['bb', 'bs', 'ci', 'cr', 'cu', 'dz', 'ht', 'ie', 'ir', 'ke', 'ng', 'pk', 'qa', 'sn', 've']);

export type CountryFlagDescriptor =
  | { kind: 'asset'; iso: string }
  | { kind: 'emoji'; iso: string; value: string }
  | { kind: 'neutral'; code: string };

function flagEmoji(iso: string) {
  return [...iso.toUpperCase()].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
}

export function countryFlagDescriptor(code?: string | null): CountryFlagDescriptor {
  const normalized = code?.trim().toLowerCase() || '';
  const iso = countryIso[normalized];
  if (!iso) return { kind: 'neutral', code: (normalized || '—').slice(0, 3).toUpperCase() };
  if (emojiOnlyIso.has(iso)) return { kind: 'emoji', iso, value: flagEmoji(iso) };
  return { kind: 'asset', iso };
}

export default function PlayerFlag({ code }: { code?: string | null }) {
  const flag = countryFlagDescriptor(code);
  if (flag.kind === 'asset') return <Image className="pd-country-flag" src={`/images/flags/${flag.iso}.svg`} width={24} height={18} alt="" unoptimized />;
  if (flag.kind === 'emoji') return <span className="pd-country-flag pd-country-flag--fallback pd-country-flag--emoji" aria-hidden="true">{flag.value}</span>;
  return <span className="pd-country-flag pd-country-flag--fallback" aria-hidden="true">{flag.code}</span>;
}
