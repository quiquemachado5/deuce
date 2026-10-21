export function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim();
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
  const terms = searchText(query).split(' '), words = searchText(name).split(' ');
  return terms.length > 0 && terms.every(term => words.some(word => word.startsWith(term) || withinOneEdit(term, word)));
}
