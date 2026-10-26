'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from '@/app/records/records.module.css';

type Crown = { years: Array<{ year: number; leaders: string[]; total: number }>; scope: string };

export default function GrandSlamCrown() {
  const [data, setData] = useState<Crown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const load = async () => {
    if (data || loading) return;
    setLoading(true); setError(false);
    try {
      const response = await fetch('/api/records/grand-slam-crown');
      if (!response.ok) throw new Error('No disponible');
      setData(await response.json());
    } catch { setError(true); } finally { setLoading(false); }
  };
  const changes = data?.years.filter((point, index, years) => index === 0 || point.total !== years[index - 1].total || point.leaders.join('|') !== years[index - 1].leaders.join('|')) || [];
  return <section className={styles.crown} aria-labelledby="grand-slam-crown-title">
    <div><h2 id="grand-slam-crown-title">La corona del Grand Slam</h2><p>Quién acumulaba más títulos del archivo al cerrar cada temporada.</p></div>
    <button type="button" onClick={load} aria-expanded={Boolean(data)} disabled={loading}>{loading ? 'Calculando…' : data ? 'Evolución cargada' : 'Ver evolución'}<ChevronDown size={16} aria-hidden="true" /></button>
    {error && <p role="alert">No se pudo calcular ahora. Vuelve a intentarlo.</p>}
    {data && <div className={styles.crownTrack} tabIndex={0} aria-label={data.scope}>{changes.map(point => <article key={`${point.year}-${point.total}`}><span>{point.year}</span><strong>{point.leaders.join(' · ')}</strong><b>{point.total}</b><small>títulos acumulados</small></article>)}</div>}
  </section>;
}
