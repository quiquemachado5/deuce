import { metadataReview } from '@/lib/metadata-review';
import { playerPhoto } from '@/lib/player-imagery';
import { playerSlug } from '@/lib/explore';
import Link from "next/link";
import { preparedGeneration, recordView, preparedEditionAudit } from "@/lib/revista/read-records";
import ArchiveNotice from "@/components/nocturno/ArchiveNotice";
import { number } from "@/lib/cuaderno/model";
import { SURFACES, surfaceLabel } from "@/lib/surface";
import { fieldCoverage } from "@/lib/field-coverage";
import { verifiedResults, australian2026Corrections } from "@/lib/verified-results";
import { editionCompleteness } from "@/lib/edition-audit";

export const metadata = {
  title: "Cobertura del archivo — DEUCE",
  description:
    "Consulta qué temporadas tienen resultados, ranking histórico, estadísticas y puntos documentados.",
  alternates: { canonical: "/cobertura" },
};
export const revalidate = 300;
export default async function Coverage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const selection = query.dato ? await recordView(JSON.stringify(query)) : null;
  const piece = selection?.piece;
  const generation = await preparedGeneration(),
    manifest = generation.manifest;
  const matches = await generation.matches(), fields = fieldCoverage(matches), review = metadataReview(matches);
  const missingPortraits = (await generation.records()).filter(player=>!playerPhoto(player.name)).sort((a,b)=>b.played-a.played);
  const editions=(await preparedEditionAudit()).map(edition=>({...edition,...editionCompleteness(edition)}));const pending=editions.filter(e=>e.pending>0);
  return (
    <div className="nc-wrap deuce-coverage">
      <ArchiveNotice status={generation} />
      <header>
        <h1>Cobertura del archivo</h1>
        <p>
          {number(manifest.matchCount)} partidos ·{" "}
          {number(manifest.summary.tournaments)} torneos.
        </p>
        <p>
          Cálculo actualizado el{" "}
          {new Date(manifest.generatedAt).toLocaleString("es-ES", {
            timeZone: "Europe/Madrid",
          })}
          . Hora de Madrid.
        </p>
      </header>
      <section className="coverage-metric"><h2>Campos pendientes de documentar</h2><p>No reconstruimos categorías, rondas ni fechas a partir de una fotografía o de una temporada distinta.</p><dl>{[['Fecha exacta',review.missing.exactDate],['Categoría',review.missing.category],['Ronda',review.missing.round],['Superficie',review.missing.surface]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{number(Number(value))} partidos</dd></div>)}</dl><details><summary>Ediciones que necesitan fuentes adicionales</summary><ul>{review.editions.slice(0,20).map(item=><li key={item.tournament+item.year}>{item.tournament} {item.year}: {item.missing.join(', ')}</li>)}</ul></details><details><summary>Retratos pendientes · {number(missingPortraits.length)} jugadores</summary><p>Prioridad por presencia en el archivo. Solo se incorporan fotografías identificadas y con derechos documentados.</p><ul>{missingPortraits.slice(0,20).map(player=><li key={player.name}><Link href={'/jugadores/'+playerSlug(player.name)}>{player.name}</Link> · {number(player.played)} partidos</li>)}</ul></details></section>
      {piece && (
        <section className="coverage-metric" id="estadistica">
          <h2>{piece.title}</h2>
          <p>{piece.definition}</p>
          <dl>
            <div>
              <dt>Periodo</dt>
              <dd>{piece.years}</dd>
            </div>
            <div>
              <dt>Partidos considerados</dt>
              <dd>{number(piece.sample)}</dd>
            </div>
            <div>
              <dt>Mínimo por entrada</dt>
              <dd>{piece.minimum} casos</dd>
            </div>
          </dl>
        </section>
      )}
      <p>
        Un partido sin datos adicionales no equivale a cero. Los porcentajes y
        récords solo consideran los encuentros con los datos necesarios. Este
        archivo no representa necesariamente toda una carrera.
      </p>
      <section className="coverage-metric" id="ediciones"><h2>Revisión automática por edición</h2><p>{number(editions.length)} ediciones revisadas. {number(editions.filter(e=>e.completeDraw===false).length)} tienen huecos en cuartos, semifinales o final; {number(pending.length)} conservan marcadores pendientes de cierre o contraste. Una edición nueva puede estar en curso, pero una edición ya verificada no puede perder rondas en la siguiente publicación.</p><details><summary>Ediciones que necesitan revisión</summary><div className="deuce-coverage-table" role="region" aria-label="Revisión de ediciones" tabIndex={0}><table><caption>Primeras 25 ediciones por temporada. Un hueco describe la fuente guardada; no implica que el partido no se disputara.</caption><thead><tr><th scope="col">Torneo</th><th scope="col">Año</th><th scope="col">Filas</th><th scope="col">Completos</th><th scope="col">Retiradas</th><th scope="col">Incidencia</th></tr></thead><tbody>{editions.filter(e=>e.pending>0||e.completeDraw===false).slice(0,25).map(e=><tr key={`${e.tournament}-${e.year}-${e.category}`}><th scope="row">{e.tournament}</th><td>{e.year}</td><td>{number(e.sourceRows)}</td><td>{number(e.completed)}</td><td>{number(e.terminal)}</td><td>{[...(e.missingLateRounds||[]),e.pending?`${number(e.pending)} pendientes`:null].filter(Boolean).join(' · ')||'Revisión manual'}</td></tr>)}</tbody></table></div></details></section>
      <section className="coverage-metric">
        <h2>Resultados contrastados</h2>
        <p>
          {verifiedResults.length} marcadores de Roland Garros 2024 estaban
          incompletos en la fuente principal. Se han contrastado con el cuadro
          oficial de FFT y documentación de ATP. Cada partido enlaza su referencia
          en el registro. Las medidas y los puntos del resultado incompleto no
          se reutilizan para calcular estadísticas.
        </p>
        <p>
          Las retiradas y las victorias sin jugar no cuentan como partidos
          terminados. Algunas ediciones antiguas conservan lagunas de origen;
          un cuadro incompleto no se rellena con resultados estimados.
        </p>
        <p>{australian2026Corrections.length} marcadores truncados de Australia 2026 se han cerrado con referencias del torneo, ATP y TNNS. Las dos semifinales, la final y la retirada de Mensik se documentan con fuentes oficiales. La API principal mantiene prioridad cuando publica el mismo encuentro; la identidad, ronda y temporada impiden duplicarlo.</p>
      </section>
      <section className="coverage-metric">
        <h2>Actualización diaria</h2>
        <p>
          El servidor consulta novedades cada día a las 04:00 UTC y publica las
          estadísticas a las 05:00 UTC. No depende de que tu ordenador esté
          encendido. La comprobación de salud distingue la fecha del despliegue
          de la última descarga y publicación; avisa si estas fallan o superan
          36 horas.
        </p>
      </section>
      <section
        className="coverage-fields"
        aria-labelledby="coverage-fields-title"
      >
        <h2 id="coverage-fields-title">La muestra detrás de cada dato</h2>
        <p>
          Partidos con el campo guardado, sobre {number(fields.total)}{" "}
          encuentros. Un cero publicado cuenta; un campo vacío, no. Cada
          porcentaje exige además un denominador válido.
        </p>
        {[
          { title: "Contexto histórico", rows: fields.context },
          { title: "Medidas del partido", rows: fields.measures },
        ].map((group) => {
          const maximum = Math.max(1, ...group.rows.map((row) => row.matches));
          return (
            <details
              className="coverage-field-group"
              key={group.title}
              open={group.title === "Medidas del partido"}
            >
              <summary>
                {group.title}
                <span>{group.rows.length} campos</span>
              </summary>
              <p className="coverage-field-scale">
                <span>Partidos con dato</span>
                <span>0–{number(maximum)}</span>
              </p>
              <ul>
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <div className="coverage-field-heading">
                      <span>{row.label}</span>
                      <strong>
                        {number(row.matches)} <small>partidos</small>
                      </strong>
                    </div>
                    <div className="coverage-field-track" aria-hidden="true">
                      <span
                        style={{ width: `${(row.matches / maximum) * 100}%` }}
                      />
                    </div>
                    <p>
                      {row.years.length === 1
                        ? row.years[0]
                        : `${row.years[0]}–${row.years.at(-1)}`}
                      {row.id !== "minutes" && (
                        <> · {number(row.both)} con ambos jugadores</>
                      )}
                    </p>
                    <details className="coverage-field-detail">
                      <summary>Temporadas y procedencia</summary>
                      <p>{row.years.join(", ")}.</p>
                      <p>
                        Archivo histórico: {number(row.historical)} · Archivo
                        reciente: {number(row.recent)}.
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        <h2>Registro punto a punto</h2>
        <dl className="coverage-tape-states">
          <div>
            <dt>Con cinta fiable</dt>
            <dd>{number(fields.reliable)}</dd>
          </div>
          <div>
            <dt>Secuencia incompleta</dt>
            <dd>{number(fields.partial)}</dd>
          </div>
          <div>
            <dt>Sin cinta de puntos</dt>
            <dd>{number(fields.none)}</dd>
          </div>
        </dl>
        <p>
          Solo una cinta que cierra con el marcador permite calcular la presión
          del partido completo. En una secuencia incompleta se conservan los
          juegos verificados.
        </p>
      </section>
      <aside className="dx-notice">
        <Link href="/cobertura/revision">Abrir la revisión histórica</Link>
        <p>
          Coincidencias pendientes de contraste, precisión de fechas y lagunas
          de ranking. Sin fusiones automáticas ni datos inventados.
        </p>
      </aside>
      <h2>El color de los datos</h2><p>Los totales generales usan tinta neutra. Hierba, tierra, dura y moqueta conservan su color de superficie. En el calendario, campeón es dorado; finalista, plata; semifinal, verde azulado; cuartos, azul; octavos, violeta; tercera ronda, rosa; segunda, arena; primera, gris. Es el mismo código para todos los jugadores.</p>
      <h2>Superficies registradas</h2>
      <dl className="deuce-coverage-surfaces">
        {SURFACES.map((surface) => (
          <div key={surface} data-event-surface={surface}>
            <dt>
              <i className={`nc-dot nc-dot-${surface}`} aria-hidden="true" />
              {surfaceLabel[surface]}
            </dt>
            <dd>{number(manifest.summary.surfaces[surface])}</dd>
          </div>
        ))}
      </dl>
      <h2>Datos por temporada</h2>
      <p>
        Ranking: al menos uno de los jugadores tiene ranking de la fecha del
        partido. Cada estadística exige el dato del rival correspondiente. Los
        puntos documentados pueden ser una secuencia parcial.
      </p>
      <div
        className="deuce-coverage-table"
        tabIndex={0}
        role="region"
        aria-label="Cobertura por año; tabla desplazable"
      >
        <table>
          <caption>
            Número de partidos con cada tipo de dato. Las columnas pueden
            solaparse.
          </caption>
          <thead>
            <tr>
              <th scope="col">Año</th>
              <th scope="col">Partidos</th>
              <th scope="col">Ranking histórico</th>
              <th scope="col">Estadísticas</th>
              <th scope="col">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {manifest.summary.years.map((row) => (
              <tr key={row.year}>
                <th scope="row">{row.year}</th>
                <td>{number(row.matches)}</td>
                <td>{row.ranking ? number(row.ranking) : "Sin dato"}</td>
                <td>{row.statistics ? number(row.statistics) : "Sin dato"}</td>
                <td>{row.points ? number(row.points) : "Sin dato"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/info">Cómo se calcula y se valida el archivo</Link> ·{" "}
        <Link href="/records">Explorar estadísticas</Link>
      </p>
      <p>
        Origen de esta lectura:{" "}
        {generation.source === "remote"
          ? "generación remota validada"
          : "copia validada incluida en el despliegue"}
        . Las páginas almacenadas en caché pueden actualizarse en momentos
        distintos; compara la versión cuando contrastes cifras.
      </p>
      <p className="nc-meta">
        Versión de datos: <code>{manifest.version}</code> · Reglas:{" "}
        <code>{manifest.rulesVersion}</code>
      </p>
    </div>
  );
}
