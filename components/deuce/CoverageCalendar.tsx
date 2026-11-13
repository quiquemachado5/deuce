import { toMatchRecord } from '@/data/map-match';
import { preparedCompactSelection, preparedTimeMachineProducts } from '@/lib/revista/read-records';
import { MatchScoreboard } from './MatchScoreboard';
import { TimeMachineDateForm } from './TimeMachineDateForm';
import styles from './coverage-calendar.module.css';

export async function CoverageCalendar({ value, circuit }: {
  value?: string; circuit?: string;
}) {
  const locale = 'es-ES';
  const date = typeof value === 'string' ? value.replace(/^2000-/, '') : undefined;
  const parsed = new Date(`2000-${date}T12:00:00Z`);
  const valid = Boolean(date && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(5, 10) === date);
  const [month, day] = (valid ? date! : new Date().toISOString().slice(5, 10)).split('-').map(Number);
  const tour = circuit === 'atp' || circuit === 'wta' ? circuit : 'all';
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  const months = Array.from({ length: 12 }, (_, index) => monthFormat.format(Date.UTC(2000, index, 1)));
  // The regular coverage page stays light: only read match data after a date is chosen.
  const entries = valid
    ? ((await preparedTimeMachineProducts()).days[date!] || []).filter(row => tour === 'all' || row.tour === tour).slice(0, 4)
    : [];
  const selections = await Promise.all(entries.map(row => preparedCompactSelection({ tour: row.tour, fromYear: row.year, toYear: row.year, ids: [row.id] })));
  const matches = selections.flat().map(match => {
    const record = toMatchRecord(match);
    return record;
  });

  return <section className={styles.section} id="por-fecha" aria-labelledby="coverage-calendar-title">
    <div className={styles.heading}>
      <div><h2 id="coverage-calendar-title">{'Resultados por fecha'}</h2>
        <p>{'Encuentra partidos destacados que se jugaron este día en otros años.'}</p></div>
      <TimeMachineDateForm key={date ?? 'today'} action="/cobertura#por-fecha" language="es" day={day} month={month} months={months} tour={tour} className={styles.form} showCircuit />
    </div>
    {valid && (matches.length
      ? <div className={styles.results} aria-label={'Selección de resultados históricos'}>{matches.map(match => <MatchScoreboard match={match}  key={match.id} />)}</div>
      : <p className={styles.message} role="status">{'No hay resultados fechados para esta selección. Prueba otro día o circuito.'}</p>)}
    {value && !valid && <p className={styles.message} role="status">{'Elige un día y un mes válidos.'}</p>}
  </section>;
}
