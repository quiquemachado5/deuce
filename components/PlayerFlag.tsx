import Image from 'next/image';

/** Provider country codes only. Local SVGs: lipis/flag-icons, MIT. */
const countryIso: Record<string, string> = {
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

export default function PlayerFlag({ code }: { code: string }) {
  const iso = countryIso[code.toLowerCase()];
  if (!iso) return null;
  return <Image className="pd-country-flag" src={`/images/flags/${iso}.svg`} width={24} height={18} alt="" unoptimized />;
}
