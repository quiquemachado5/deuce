import Link from "next/link";
import styles from "./info.module.css";

export const metadata = {
  title: "Cómo se lee — DEUCE",
  description: "Qué partidos entran en DEUCE, qué significan sus niveles de detalle y cómo se interpretan las estadísticas.",
  alternates: { canonical: "/info" },
};

const readings = [
  { number: "01", title: "Con puntos", description: "La secuencia conserva el orden de los puntos y cuadra con el marcador. Permite seguir juegos, breaks y bolas de partido." },
  { number: "02", title: "Secuencia parcial", description: "Faltan puntos o algún total no cuadra. DEUCE muestra únicamente los juegos y medidas que sí están documentados." },
  { number: "03", title: "Solo marcador", description: "No existe una cinta de puntos. Se publican los sets y las estadísticas disponibles, sin reconstruir información." },
];

const measures = [
  ["Muestra", "Cada porcentaje conserva su denominador: solo cuenta partidos donde esa medida existe."],
  ["Comparación", "Las barras comparten escala y la mediana representa a jugadores con una muestra suficiente."],
  ["Ausencias", "Un hueco significa que no hay registro. Nunca se interpreta como un cero."],
] as const;

export default function Info() {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>GUÍA DEL ARCHIVO</p>
        <h1>Cómo se lee DEUCE</h1>
        <p className={styles.lead}>Una guía breve para saber qué entra, cuánto detalle tiene cada partido y qué significa cada cifra.</p>
        <div className={styles.scopeLine} aria-label="Alcance principal">
          <span>ATP + WTA</span><span>Individuales</span><span>Cuadro principal</span><span>Partidos terminados</span>
        </div>
      </header>

      <section className={styles.coverage} aria-labelledby="info-coverage-title">
        <div className={styles.sectionHeading}><p>01 · COBERTURA</p><h2 id="info-coverage-title">Qué entra en el archivo</h2></div>
        <div className={styles.tourCards}>
          <div><span>ATP</span><strong>Grand Slam</strong><p>Masters 1000 · ATP 500 · ATP 250</p></div>
          <div><span>WTA</span><strong>Grand Slam</strong><p>WTA 1000 · WTA 500 · WTA 250</p></div>
        </div>
        <p className={styles.exclusion}>Quedan fuera las demás categorías, los abandonos, las incomparecencias y los marcadores todavía en revisión.</p>
      </section>

      <section className={styles.readings} aria-labelledby="info-readings-title">
        <div className={styles.sectionHeading}><p>02 · NIVEL DE DETALLE</p><h2 id="info-readings-title">Tres lecturas posibles</h2></div>
        <div className={styles.readingGrid}>
          {readings.map(({ number, title, description }) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section className={styles.measures} aria-labelledby="info-measures-title">
        <div className={styles.sectionHeading}><p>03 · ESTADÍSTICAS</p><h2 id="info-measures-title">Qué cuenta una cifra</h2></div>
        <div className={styles.measureList}>
          {measures.map(([title, description]) => <div key={title}><strong>{title}</strong><p>{description}</p></div>)}
        </div>
      </section>

      <nav className={styles.links} aria-label="Continuar desde la guía">
        <Link className={styles.primaryLink} href="/cobertura">Ver cobertura exacta <span aria-hidden="true">↗</span></Link>
        <Link href="/records">Explorar récords</Link><Link href="/licencias">Consultar licencias</Link>
      </nav>
    </article>
  );
}
