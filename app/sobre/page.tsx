import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './about.module.css';

const repository = 'https://github.com/quiquemachado5/deuce';
const correction = `${repository}/issues/new`;

export const metadata: Metadata = {
  title: 'Sobre DEUCE, metodología y privacidad',
  description: 'Quién mantiene DEUCE, cómo se publican y corrigen sus datos y qué información técnica guarda el sitio.',
  alternates: { canonical: '/sobre' },
};

export default function About() {
  return <article className={styles.page}>
    <header className={styles.hero}>
      <h1>Sobre DEUCE</h1>
      <p>Un archivo independiente para explorar resultados ATP y WTA sin ocultar qué datos existen, cuáles faltan y de dónde procede cada recurso.</p>
    </header>

    <section className={styles.statement} aria-labelledby="about-purpose-title">
      <h2 id="about-purpose-title">El archivo antes que la estimación.</h2>
      <p>DEUCE publica resultados documentados. Si una fuente no aporta una estadística, un punto o un partido, el sitio muestra ese límite: no rellena la ausencia con un dato inventado.</p>
    </section>

    <section className={styles.section} aria-labelledby="about-method-title">
      <div><h2 id="about-method-title">Método</h2><p>El alcance actual se centra en individuales ATP y WTA de Grand Slam, categorías 1000, 500 y 250. Cada circuito se procesa y comprueba por separado.</p></div>
      <div className={styles.points}>
        <div><strong>Publicación</strong><p>Solo entran partidos terminados que superan las validaciones de identidad, ronda, torneo y marcador.</p></div>
        <div><strong>Profundidad</strong><p>Ranking, estadísticas y punto a punto se muestran únicamente cuando la fuente los proporciona y el contenido cuadra con el resultado.</p></div>
        <div><strong>Trazabilidad</strong><p>La versión publicada, la cobertura por circuito y los controles pendientes se pueden consultar en una única página.</p></div>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="about-corrections-title">
      <div><h2 id="about-corrections-title">Correcciones</h2><p>Una corrección necesita evidencia suficiente para identificar el encuentro sin ambigüedad. El registro original no se sustituye por una aproximación.</p></div>
      <div className={styles.correction}>
        <p>Indica el ID o enlace del partido, jugadores, torneo, año y una fuente verificable. El canal es público: no incluyas información personal o confidencial.</p>
        <a href={correction} target="_blank" rel="noopener noreferrer">Proponer una corrección en GitHub <ArrowUpRight size={16} aria-hidden="true"/></a>
        <Link href="/cobertura#revision">Ver controles e incidencias</Link>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="about-privacy-title">
      <div><h2 id="about-privacy-title">Privacidad</h2><p>DEUCE no requiere una cuenta para consultar el archivo ni utiliza el historial personal para publicidad.</p></div>
      <div className={styles.points}>
        <div><strong>Sin cuenta</strong><p>El archivo se puede consultar sin registro, perfil personal ni seguimiento publicitario.</p></div>
        <div><strong>Rendimiento</strong><p>El navegador envía métricas técnicas agregables —como LCP, INP o CLS— junto con la ruta visitada para detectar páginas lentas.</p></div>
        <div><strong>Protección</strong><p>La dirección de red se procesa temporalmente en memoria para limitar abuso de la API pública. La aplicación no la incorpora a los eventos de rendimiento.</p></div>
      </div>
    </section>

    <nav className={styles.actions} aria-label="Más información sobre DEUCE">
      <Link href="/info">Cómo se lee</Link>
      <Link href="/cobertura">Cobertura exacta</Link>
      <Link href="/licencias">Licencias</Link>
      <a href={repository} target="_blank" rel="noopener noreferrer">Código fuente <ArrowUpRight size={16} aria-hidden="true"/></a>
    </nav>
  </article>;
}
