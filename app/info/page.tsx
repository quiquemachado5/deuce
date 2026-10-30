import Link from "next/link";

export const metadata = {
  title: "Cómo se lee — DEUCE",
  description: "Qué partidos entran en DEUCE y cómo se leen sus datos.",
  alternates: { canonical: "/info" },
};

const readings = [
  { title: "Con puntos", description: "La secuencia conserva el orden de los puntos y cuadra con el resultado. Permite seguir los juegos, las bolas de break y las bolas de partido." },
  { title: "Secuencia incompleta", description: "Hay puntos que no cuadran con el marcador o sus totales. Se muestran los juegos que sí cierran y las medidas publicadas, sin rellenar los huecos." },
  { title: "Solo marcador", description: "No hay cinta de puntos. Se muestran los sets y las medidas que publicó la fuente. No se reconstruyen puntos que no existen." },
];

export default function Info() {
  return (
    <article className="ry-help-page">
      <header className="ry-help-intro">
        <h1>Cómo se lee DEUCE</h1>
      </header>
      <section className="ry-help-scope" aria-labelledby="ry-help-scope-title">
        <h2 id="ry-help-scope-title">Qué entra en el archivo</h2>
        <div className="ry-help-prose">
          <p>Individuales ATP y WTA del cuadro principal: partidos terminados, sets cerrados y ganador coherente. Los cuadros se identifican por separado.</p>
          <p>Grand Slams, Masters y torneos ATP/WTA según la categoría que documenta la fuente. Los niveles históricos que no pueden equipararse a las categorías actuales aparecen identificados aparte.</p>
          <p>Abandonos, incomparecencias y marcadores en revisión quedan fuera de los porcentajes y clasificaciones.</p>
        </div>
      </section>
      <section className="ry-help-reading" aria-labelledby="ry-help-reading-title">
        <h2 id="ry-help-reading-title">Tres lecturas posibles</h2>
        <div className="ry-help-reading-list">
          {readings.map(({ title, description }) => (
            <div className="ry-help-reading-row" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="ry-help-scope ry-help-measures" aria-labelledby="ry-help-measures-title">
        <h2 id="ry-help-measures-title">Qué cuenta una cifra</h2>
        <div className="ry-help-prose">
          <p>El enlace «Sobre los datos» de cada estadística abre su periodo, exclusiones, tamaño de muestra y mínimo en Cobertura. Los porcentajes conservan su denominador.</p>
          <p>En las comparaciones, la marca de mediana representa a los jugadores con muestra suficiente. Las barras de cada medida comparten escala. Un hueco en una serie indica ausencia de registro, no un cero.</p>
          <p>Aces, saques y golpes solo cuentan los partidos donde la fuente publicó esa medida. Un ranking histórico aparece únicamente cuando corresponde a la fecha del encuentro.</p>
        </div>
        <div className="ry-help-links">
          <Link href="/records">Ver clasificaciones</Link>
          <Link href="/licencias">Licencias</Link>
        </div>
      </section>
    </article>
  );
}
