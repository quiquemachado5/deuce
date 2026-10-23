import Link from 'next/link';
import { HeroPlayback } from './HeroPlayback';
export function HeroVideo({ count }: { count:number }) {
  return <section className="hero" aria-labelledby="hero-title"><div className="hero-media">
    <HeroPlayback />
    <div className="hero-shade"/>
    <div className="hero-copy"><h1 id="hero-title">TODO EL TENIS<br/><em>Partido a partido</em></h1><p>{new Intl.NumberFormat('es-ES').format(count)} partidos desde 1968.</p><Link className="round-cta" href="/buscar">Buscar en el archivo <span aria-hidden="true">↗</span></Link></div>
    <Link className="image-caption" href="/credits#video">Tenis en movimiento · Pexels</Link>
  </div></section>;
}
