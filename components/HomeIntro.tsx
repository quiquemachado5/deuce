import Image from 'next/image';
import AnimatedCounter from './AnimatedCounter';
import HomeSearch from './HomeSearch';

export default function HomeIntro({ count, firstYear }: { count: number; firstYear: number }) {
  return <section className="home-intro" aria-labelledby="home-intro-title">
    <div className="home-intro-content">
      <span className="home-intro-wordmark">DEUCE</span>
      <h1 id="home-intro-title">El tenis, partido a partido</h1>
      <p className="home-intro-lead"><strong><AnimatedCounter value={count} /></strong><span>partidos documentados desde {firstYear}</span></p>
      <HomeSearch />
    </div>
    <div className="home-intro-scene">
      <Image src="/images/court-editorial.jpg" alt="Pista de tierra batida vista desde arriba al atardecer" fill priority sizes="100vw" />
      <div className="home-intro-footnote"><span>Un archivo visual del tenis</span><a href="#home-featured-title">Descubrir <span aria-hidden="true">↓</span></a></div>
    </div>
  </section>;
}
