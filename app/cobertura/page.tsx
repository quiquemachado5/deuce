import Link from 'next/link';
import { preparedGeneration } from '@/lib/revista/read-records';
import ArchiveNotice from '@/components/nocturno/ArchiveNotice';
import { number } from '@/lib/cuaderno/model';
import { SURFACES, surfaceLabel } from '@/lib/surface';
import './coverage.css';

export const metadata = { title: 'Cobertura del archivo — DEUCE', description: 'Consulta qué temporadas tienen resultados, ranking histórico, estadísticas y puntos documentados.', alternates: { canonical: '/cobertura' } };
export const revalidate = 300;
export default async function Coverage() {
  const generation = await preparedGeneration(), manifest = generation.manifest;
  return <div className="nc-wrap deuce-coverage">
    <ArchiveNotice status={generation} />
    <header><h1>Cobertura del archivo</h1><p>{number(manifest.matchCount)} partidos · {number(manifest.summary.tournaments)} torneos.</p>
      <p>Actualizado el {new Date(manifest.generatedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}. Hora de Madrid.</p></header>
    <p>Un partido sin datos adicionales no equivale a cero. Los porcentajes y récords solo consideran los encuentros con los datos necesarios. Este archivo no representa necesariamente toda una carrera.</p>
    <aside className="dx-notice"><Link href="/cobertura/revision">Abrir la revisión histórica</Link><p>Coincidencias pendientes de contraste, precisión de fechas y lagunas de ranking. Sin fusiones automáticas ni datos inventados.</p></aside>
    <h2>Superficies registradas</h2><dl className="deuce-coverage-surfaces">{SURFACES.map(surface => <div key={surface}><dt>{surfaceLabel[surface]}</dt><dd>{number(manifest.summary.surfaces[surface])}</dd></div>)}</dl>
    <h2>Datos por temporada</h2><p>Ranking: al menos uno de los jugadores tiene ranking de la fecha del partido. Cada estadística exige el dato del rival correspondiente. Los puntos documentados pueden ser una secuencia parcial.</p>
    <div className="deuce-coverage-table" tabIndex={0} role="region" aria-label="Cobertura por año; tabla desplazable"><table><caption>Número de partidos con cada tipo de dato. Las columnas pueden solaparse.</caption><thead><tr><th scope="col">Año</th><th scope="col">Partidos</th><th scope="col">Ranking histórico</th><th scope="col">Estadísticas</th><th scope="col">Puntos</th></tr></thead><tbody>{manifest.summary.years.map(row => <tr key={row.year}><th scope="row">{row.year}</th><td>{number(row.matches)}</td><td>{row.ranking ? number(row.ranking) : 'Sin dato'}</td><td>{row.statistics ? number(row.statistics) : 'Sin dato'}</td><td>{row.points ? number(row.points) : 'Sin dato'}</td></tr>)}</tbody></table></div>
    <p><Link href="/info">Cómo se calcula y se valida el archivo</Link> · <Link href="/records">Explorar estadísticas</Link></p>
    <p>Origen de esta lectura: {generation.source === 'remote' ? 'generación remota validada' : 'copia validada incluida en el despliegue'}. Las páginas almacenadas en caché pueden actualizarse en momentos distintos; compara la versión cuando contrastes cifras.</p>
    <p className="nc-meta">Versión de datos: <code>{manifest.version}</code> · Reglas: <code>{manifest.rulesVersion}</code></p>
  </div>;
}
