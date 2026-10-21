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
          <p>Individual masculino del cuadro principal: partidos terminados, sets cerrados y ganador coherente.</p>
          <p>Grand Slams, Masters desde 1990 y ATP 500/250 desde 2023. El ATP Tour histórico sin nivel distinguible y los precursores de Masters aparecen identificados aparte.</p>
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
          <p>Cada clasificación declara su periodo, exclusiones y tamaño de muestra.</p>
          <p>Aces, saques y golpes solo cuentan los partidos donde la fuente publicó esa medida. Un ranking histórico aparece únicamente cuando corresponde a la fecha del encuentro.</p>
        </div>
        <div className="ry-help-links">
          <Link href="/records">Ver clasificaciones</Link>
          <Link href="/credits">Fotografías y licencias</Link>
        </div>
      </section>
    </article>
  );
}
