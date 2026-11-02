import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { HeroPlayback } from './HeroPlayback';
export function HeroVideo({ count, wtaCount = 0, atpFrom = 1968, wtaFrom }: { count:number; wtaCount?:number; atpFrom?:number|null; wtaFrom?:number|null }) {
  const coverage=wtaCount>0
    ? `partidos publicados: ATP desde ${atpFrom||1968} y WTA desde ${wtaFrom||'su primera temporada disponible'}.`
    : `partidos ATP desde ${atpFrom||1968}.`;
  return <section className="hero" aria-labelledby="hero-title"><div className="hero-media">
    <HeroPlayback />
    <div className="hero-shade"/>
    <div className="hero-copy"><h1 id="hero-title">ARCHIVO DEL TENIS<br/><em>Partido a partido</em></h1><p>{new Intl.NumberFormat('es-ES').format(count)} {coverage}</p><Link className="round-cta" href="/buscar">Buscar en el archivo <ArrowUpRight size={20} aria-hidden="true"/></Link></div>
  </div></section>;
}
