import { permanentRedirect } from 'next/navigation';

export default async function TimeMachineRedirect({ searchParams }: { searchParams: Promise<{ date?: string; tour?: string }> }) {
  const { date, tour } = await searchParams;
  const query = new URLSearchParams();
  if (typeof date === 'string' && /^(?:2000-)?\d{2}-\d{2}$/.test(date)) query.set('date', date);
  if (tour === 'atp' || tour === 'wta') query.set('tour', tour);
  permanentRedirect('/en/coverage' + (query.size ? '?' + query : '') + '#por-fecha');
}
