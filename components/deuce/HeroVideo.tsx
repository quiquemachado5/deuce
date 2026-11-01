import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { HeroPlayback } from './HeroPlayback';
export function HeroVideo({ count, wtaCount = 0 }: { count:number; wtaCount?:number }) {
  return <section className="hero" aria-labelledby="hero-title"><div className="hero-media">
    <HeroPlayback />
    <div className="hero-shade"/>
    <div className="hero-copy"><h1 id="hero-title">ARCHIVO DEL TENIS<br/><em>Partido a partido</em></h1><p>{new Intl.NumberFormat('es-ES').format(count)} partidos {wtaCount>0?'ATP y WTA':'ATP'} desde 1968.{wtaCount===0?' Archivo WTA en preparación.':''}</p><Link className="round-cta" href="/buscar">Buscar en el archivo <ArrowUpRight size={20} aria-hidden="true"/></Link></div>
  </div></section>;
}
