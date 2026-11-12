import Link from 'next/link';
import { preparedManifest } from '@/lib/revista/read-records';
import styles from './english.module.css';

export const metadata = {
  title: 'DEUCE — The tennis archive',
  description: 'Documented ATP and WTA match results, players, tournaments and records since 1968.',
  alternates: { canonical: '/en', languages: { es: '/', en: '/en' } },
};

export default async function EnglishHome() {
  const manifest = await preparedManifest();
  return <main className={styles.page} lang="en">
    <section className={styles.hero}><span>ATP + WTA · SINCE 1968</span><h1>Tennis,<br/>match by match.</h1><p>{new Intl.NumberFormat('en-GB').format(manifest.matchCount)} documented results in one independent archive.</p><Link href="/en/matches">Explore matches <b aria-hidden="true">↗</b></Link></section>
    <section className={styles.links} aria-label="Explore DEUCE">
      <Link href="/en/matches"><span>01</span><strong>Matches</strong><p>Search ATP and WTA results by year, event and surface.</p></Link>
      <Link href="/en/players"><span>02</span><strong>Players</strong><p>Career records and documented results.</p></Link>
      <Link href="/en/tournaments"><span>03</span><strong>Tournaments</strong><p>Editions, finals, champions and tournament history.</p></Link>
      <Link href="/en/records"><span>04</span><strong>Records</strong><p>Reproducible rankings calculated from the archive.</p></Link>
      <Link href="/en/compare"><span>05</span><strong>Compare</strong><p>Put two documented careers on the same scale.</p></Link>
      <Link href="/en/coverage#por-fecha"><span>06</span><strong>Results by date</strong><p>Open the archive on this day across tennis history.</p></Link>
    </section>
  </main>;
}
