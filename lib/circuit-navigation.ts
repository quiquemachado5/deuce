export type Circuit = 'atp' | 'wta';
export type CircuitSection = 'matches' | 'records' | 'players' | 'tournaments' | 'compare';

type SearchReader = Pick<URLSearchParams, 'get'>;

export function navigationCircuit(pathname: string, search: SearchReader): Circuit {
  if (
    pathname === '/wta'
    || search.get('tour') === 'wta'
    || search.get('cuadro') === 'wta'
    || search.get('circuito') === 'wta'
    || pathname.startsWith('/match/wta-')
  ) return 'wta';
  return 'atp';
}

export function circuitSectionHref(section: CircuitSection, circuit: Circuit): string {
  const wta = circuit === 'wta';
  switch (section) {
    case 'matches': return wta ? '/buscar?tour=wta' : '/buscar';
    case 'records': return wta ? '/records?tour=wta' : '/records';
    case 'players': return wta ? '/jugadores?tour=wta' : '/jugadores';
    case 'tournaments': return wta ? '/torneos?circuito=wta' : '/torneos';
    case 'compare': return wta ? '/comparar?tour=wta' : '/comparar';
  }
}
