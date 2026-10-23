import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import ParallaxPhoto from './ParallaxPhoto';
import AnimatedCounter from './AnimatedCounter';

export default function HomeIntro({ count, firstYear }: { count: number; firstYear: number }) {
  return <section className="home-intro" aria-labelledby="home-intro-title">
    <div className="home-intro-photo" aria-hidden="true">
      <ParallaxPhoto src="/images/court-editorial.jpg" alt="" />
    </div>
    <div className="home-intro-scrim" aria-hidden="true" />
    <div className="home-intro-content">
      <span className="home-intro-wordmark">DEUCE <span>— Archivo visual del tenis</span></span>
      <h1 id="home-intro-title">Cada partido.<br /><em>Una historia.</em></h1>
      <p>Décadas de tenis, de rivalidades y de momentos irrepetibles. Todo el archivo, a tu alcance.</p>
      <div className="home-intro-actions">
        <Link className="home-intro-primary" href="/buscar">Explorar partidos <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <Link className="home-intro-secondary" href="/records">Descubrir récords <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
    <div className="home-intro-footer">
      <p><strong><AnimatedCounter value={count} /></strong><span>partidos documentados desde {firstYear}</span></p>
      <a href="#ds-results-title" aria-label="Ir a los últimos resultados">Desliza para descubrir <ArrowDownRight size={16} aria-hidden="true" /></a>
    </div>
  </section>;
}
