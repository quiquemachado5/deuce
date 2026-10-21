/** Determine a year range without passing an unbounded archive to Math.min/max. */
export function yearExtent(rows: Iterable<{ year: number }>): { first: number; last: number } | null {
  let first = Infinity;
  let last = -Infinity;
  for (const row of rows) {
    if (row.year < first) first = row.year;
    if (row.year > last) last = row.year;
  }
  return first === Infinity ? null : { first, last };
}
