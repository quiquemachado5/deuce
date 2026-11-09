import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { preparedTimeMachineProducts } from '@/lib/revista/read-records';
import PlayerFlag from '@/components/PlayerFlag';
import { playerBiography } from '@/lib/player-bio';
import styles from './time-machine.module.css';

export const metadata = {
  title: 'Máquina del tiempo del tenis — DEUCE',
  description: 'Finales, hitos y partidos documentados que se jugaron un día como hoy en el archivo ATP y WTA.',
  alternates: { canonical: '/maquina-del-tiempo', languages: { es: '/maquina-del-tiempo', en: '/en/time-machine' } },
};

const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function validDay(value?: string) {
  return /^\d{2}-\d{2}$/.test(value || '') ? value! : new Date().toISOString().slice(5, 10);
}

function adjacent(day: string, offset: number) {
  const date = new Date(`2000-${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(5, 10);
}

export default async function TimeMachine({ searchParams }: { searchParams: Promise<{ fecha?: string; tour?: string }> }) {
  const query = await searchParams;
  const date = validDay(query.fecha), tour = query.tour === 'wta' ? 'wta' : query.tour === 'atp' ? 'atp' : 'all';
  const products = await preparedTimeMachineProducts();
  const matches = (products.days[date] || []).filter(match => tour === 'all' || match.tour === tour);
  const [month, day] = date.split('-').map(Number);
  const href = (next: string) => `/maquina-del-tiempo?fecha=${next}${tour === 'all' ? '' : `&tour=${tour}`}`;
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><span><CalendarDays size={18}/> Un día en el archivo</span><h1>{day} de {monthNames[month - 1]}</h1></div>
      <nav aria-label="Cambiar fecha"><Link href={href(adjacent(date,-1))} aria-label="Día anterior"><ChevronLeft/></Link><Link href={href(adjacent(date,1))} aria-label="Día siguiente"><ChevronRight/></Link></nav>
    </header>
    <nav className={styles.tours} aria-label="Circuito">
      {(['all','atp','wta'] as const).map(value => <Link key={value} aria-current={tour === value ? 'page' : undefined} href={`/maquina-del-tiempo?fecha=${date}${value === 'all' ? '' : `&tour=${value}`}`}>{value === 'all' ? 'ATP + WTA' : value.toUpperCase()}</Link>)}
    </nav>
    {matches.length ? <section className={styles.grid} aria-label={`Partidos del ${day} de ${monthNames[month - 1]}`}>
      {matches.map(match => <Link className={styles.card} href={`/match/${match.id}`} key={match.id}>
        <div className={styles.meta}><span>{match.year}</span><span>{match.tour.toUpperCase()}</span><span>{match.surface === 'clay' ? 'Tierra' : match.surface === 'grass' ? 'Hierba' : match.surface === 'hard' ? 'Dura' : match.surface}</span></div>
        <h2>{match.tournament}</h2><p>{match.round}</p>
        <div className={styles.players}>{match.players.map(name => <span data-winner={name === match.winner ? '' : undefined} key={name}><PlayerFlag code={playerBiography(name,match.tour)?.country}/><strong>{name}</strong>{name === match.winner && <b>Ganó</b>}</span>)}</div>
        <small>{match.score}</small>
      </Link>)}
    </section> : <section className={styles.empty}><h2>No hay un partido fechado para este día</h2><p>Prueba el día anterior o el siguiente. Solo mostramos fechas exactas documentadas.</p></section>}
  </main>;
}
