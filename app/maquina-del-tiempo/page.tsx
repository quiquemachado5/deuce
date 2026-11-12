import { permanentRedirect } from 'next/navigation';

export default async function TimeMachineRedirect({ searchParams }: { searchParams: Promise<{ fecha?: string; tour?: string }> }) {
  const { fecha, tour } = await searchParams;
  const query = new URLSearchParams();
  if (typeof fecha === 'string' && /^(?:2000-)?\d{2}-\d{2}$/.test(fecha)) query.set('fecha', fecha);
  if (tour === 'atp' || tour === 'wta') query.set('tour', tour);
  permanentRedirect('/cobertura' + (query.size ? '?' + query : '') + '#por-fecha');
}
