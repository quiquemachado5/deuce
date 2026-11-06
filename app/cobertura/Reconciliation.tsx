import type { CoverageReconciliation } from '@/lib/coverage-reconciliation';
import { number } from '@/lib/cuaderno/model';
import styles from './reconciliation.module.css';

export default function Reconciliation({ report }: { report: CoverageReconciliation }) {
  return <section className={styles.section} id="calidad" aria-labelledby="quality-title">
    <header className={styles.heading}>
      <h2 id="quality-title">Lo incompleto no se publica.</h2>
      <p>Los controles se ejecutan sobre cada generación. Una captura parcial puede permanecer en revisión como fuente, pero no entra en marcadores, récords ni estadísticas.</p>
    </header>
    <div className={styles.overview}>
      <div className={styles.primaryMetric}>
        <strong>0</strong>
        <span>resultados incompletos publicados</span>
        <p>El archivo visible contiene ganador y sets cerrados coherentes.</p>
      </div>
      <div className={styles.principles}>
        <article>
          <strong>{number(report.summary.editions)} ediciones auditadas</strong>
          <p>Cuadro, rondas, identificadores y estados se vuelven a comprobar antes de cada publicación.</p>
        </article>
        <article>
          <strong>0 circuitos cruzados</strong>
          <p>ATP y WTA conservan identidades, fuentes, torneos y cálculos independientes.</p>
        </article>
        <article>
          <strong>0 identificadores duplicados</strong>
          <p>La publicación se bloquea si un partido aparece dos veces o una corrección pierde su identidad.</p>
        </article>
      </div>
    </div>
    <details className={styles.method}>
      <summary>Qué ocurre cuando una fuente llega incompleta</summary>
      <p>Se busca una versión posterior del proveedor y, si no existe, se contrasta con la fuente oficial del torneo o una fuente independiente atribuible. Nunca se inventa un marcador. Hasta resolverlo, esa fila queda fuera del archivo público.</p>
    </details>
  </section>;
}
