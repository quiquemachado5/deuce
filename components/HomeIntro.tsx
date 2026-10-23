import AnimatedCounter from './AnimatedCounter';
import HomeSearch from './HomeSearch';

export default function HomeIntro({ count, firstYear }: { count: number; firstYear: number }) {
  return <section className="home-intro" aria-labelledby="home-intro-title">
    <div className="home-intro-content">
      <span className="home-intro-wordmark">DEUCE — Archivo visual del tenis</span>
      <h1 id="home-intro-title">El archivo visual<br />del tenis</h1>
      <p className="home-intro-lead"><strong><AnimatedCounter value={count} /></strong><span>partidos documentados desde {firstYear}</span></p>
      <HomeSearch />
    </div>
    <div className="home-intro-footnote"><span>Partidos. Jugadores. Historias.</span><a href="#home-featured-title">Descubrir ↓</a></div>
  </section>;
}
