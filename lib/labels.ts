const tournaments: Record<string, string> = {
  'Australian Open': 'Abierto de Australia',
  'US Open': 'Abierto de Estados Unidos',
  'Monte Carlo': 'Montecarlo',
  Rome: 'Roma',
  Canada: 'Canadá',
  Shanghai: 'Shanghái',
  Paris: 'París',
  'Lyon (France)': 'Lyon',
  Brussels: 'Bruselas',
  Tokyo: 'Tokio',
}
export function tournamentName(name: string) { return tournaments[name] || name }
/** Typography only: retain provider spelling as the stable lookup key. */
export function displayPlayerName(name: string) {
  return name.replace(/\bClement\b/g, 'Clément').replace(/\bMoise\b/g, 'Moïse');
}
