import type { CoverageReconciliation } from '@/lib/coverage-reconciliation';
import { number } from '@/lib/cuaderno/model';
import styles from './reconciliation.module.css';

export default function Reconciliation({ report }: { report: CoverageReconciliation }) {
  const reviewActive = report.issues.length > 0;

  return <section className={styles.section} id="calidad" aria-labelledby="quality-title">
    <header className={styles.heading}>
      <h2 id="quality-title">Un archivo publicado con criterio.</h2>
      <p>DEUCE incorpora únicamente resultados identificados y separa siempre ATP y WTA. Las diferencias entre fuentes se revisan antes de modificar una cifra pública.</p>
    </header>
    <div className={styles.overview}>
      <div className={styles.primaryMetric}>
        <strong>{number(report.summary.editions)}</strong>
        <span>ediciones comprobadas</span>
        <p>El control se vuelve a ejecutar al preparar cada publicación.</p>
      </div>
      <div className={styles.principles}>
        <article>
          <strong>Solo datos verificables</strong>
          <p>Un hueco no se rellena por estimación y un marcador dudoso no entra en los cálculos.</p>
        </article>
        <article>
          <strong>ATP y WTA, por separado</strong>
          <p>Fuentes, temporadas y controles independientes antes de convivir en la interfaz.</p>
        </article>
        <article>
          <strong>{reviewActive ? 'Revisión continua' : 'Control al día'}</strong>
          <p>{reviewActive ? 'Hay comprobaciones internas abiertas que no se presentan como datos resueltos.' : 'No hay comprobaciones internas abiertas en esta publicación.'}</p>
        </article>
      </div>
    </div>
    <details className={styles.method}>
      <summary>Cómo se protege la calidad del archivo</summary>
      <p>La auditoría busca identificadores repetidos, resultados incompatibles y ediciones cuyo alcance todavía no puede certificarse. Esas revisiones se gestionan fuera de la navegación pública: aquí se muestra el alcance realmente publicado, no una cola técnica.</p>
    </details>
  </section>;
}
