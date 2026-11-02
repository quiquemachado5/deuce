export type Circuit = 'atp' | 'wta';
export type SearchCircuit = Circuit | 'all';
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

/**
 * Search follows the active circuit inside archive sections. Pages without a
 * circuit context (home, methodology, stories, etc.) search the full archive.
 */
export function globalSearchCircuit(pathname: string, search: SearchReader): SearchCircuit {
  if (search.get('tour') === 'all') return 'all';
  if (
    search.get('tour') === 'wta'
    || search.get('cuadro') === 'wta'
    || search.get('circuito') === 'wta'
    || pathname === '/wta'
    || pathname.startsWith('/match/wta-')
  ) return 'wta';
  if (
    search.get('tour') === 'atp'
    || search.get('cuadro') === 'atp'
    || search.get('circuito') === 'atp'
  ) return 'atp';
  if (
    pathname === '/buscar'
    || pathname === '/records'
    || pathname.startsWith('/records/')
    || pathname === '/jugadores'
    || pathname.startsWith('/jugadores/')
    || pathname.startsWith('/players/')
    || pathname === '/torneos'
    || pathname.startsWith('/torneos/')
    || pathname.startsWith('/torneo/')
    || /^\/[a-z0-9-]+\/\d{4}$/.test(pathname)
    || pathname === '/comparar'
    || pathname === '/compare'
    || pathname.startsWith('/match/')
  ) return 'atp';
  return 'all';
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
