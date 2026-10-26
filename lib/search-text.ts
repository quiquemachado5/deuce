export function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim();
}

const searchAliases: [RegExp, string][] = [
  [/\b(?:australian open|open de australia)\b/g, 'abierto de australia'],
  [/\b(?:french open|open de francia|rg)\b/g, 'roland garros'],
  [/\b(?:us open|u s open|united states open|open de estados unidos)\b/g, 'abierto de estados unidos'],
  [/\b(?:shangai|shanghai)\b/g, 'shanghai'],
  [/\b(?:francia|france)\b/g, 'france'],
  [/\b(?:reino unido|gran bretana|great britain|united kingdom)\b/g, 'reino unido'],
  [/\b(?:estados unidos|ee uu|usa|united states)\b/g, 'estados unidos'],
  [/\b(?:quarterfinals?|quarter finals?)\b/g, 'cuartos de final'],
  [/\b(?:semifinals?|semi finals?)\b/g, 'semifinales'],
  [/\b(?:round of 16|last 16)\b/g, 'octavos de final'],
  [/\b(?:first round)\b/g, 'primera ronda'],
  [/\b(?:second round)\b/g, 'segunda ronda'],
  [/\b(?:third round)\b/g, 'tercera ronda'],
];

/** Normalized archive vocabulary shared by the global and match searches. */
export function canonicalSearchText(value: string) {
  let normalized = searchText(value);
  for (const [pattern, replacement] of searchAliases) normalized = normalized.replace(pattern, replacement);
  return normalized.replace(/[^\p{L}\p{N}%]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Conservative typo matching for entity names, never for numerical evidence. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

export function approximateName(query: string, name: string) {
  const terms = canonicalSearchText(query).split(' '), words = canonicalSearchText(name).split(' ');
  return terms.length > 0 && terms.every(term => words.some(word => word.startsWith(term) || withinOneEdit(term, word)));
}

export function searchTermsMatch(terms: string[], value: string) {
  const words = canonicalSearchText(value).split(' ').filter(Boolean);
  return terms.every(term => words.some(word => word === term || word.startsWith(term) || withinOneEdit(term, word)));
}
