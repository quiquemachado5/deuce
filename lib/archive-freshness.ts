import type { Match } from './types';

export function exactDay(value: string | null | undefined) {
  const day = value?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null;
}
export function archiveExtent(matches: Match[], now = new Date()) {
  let latestExactDate: string | null = null, latestEditionDate: string | null = null, exactDates = 0;
  const today = now.toISOString().slice(0, 10);
  for (const match of matches) {
    const day = exactDay(match.context?.date);
    if (!day || day > today) continue;
    if (match.context?.dateLabel === 'Fecha del partido') {
      exactDates++;
      if (!latestExactDate || day > latestExactDate) latestExactDate = day;
    } else if (!latestEditionDate || day > latestEditionDate) latestEditionDate = day;
  }
  return { latestExactDate, latestEditionDate, exactDates };
}
export const archiveDate = (date: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
