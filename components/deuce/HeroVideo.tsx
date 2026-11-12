import Link from 'next/link';
import { HeroPlayback } from './HeroPlayback';
import styles from '@/app/home-editorial.module.css';
export function HeroVideo() {
  return <section id="home-top" className={styles.hero} aria-labelledby="hero-title" data-home-depth="90">
    <div className={styles.heroFilm}><HeroPlayback/></div>
    <div className={styles.heroShade}/>
    <div className={styles.heroContent}>
      <h1 id="hero-title">Cada partido<br/><span>cuenta.</span></h1>
      <div className={styles.heroBottom}>
        <p>El tenis que recuerdas.<br/>Los datos que te faltaban.</p>
        <Link className={styles.primaryAction} href="/buscar">Explorar el archivo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></Link>
      </div>
    </div>
  </section>;
}
