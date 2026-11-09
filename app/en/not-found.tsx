import Link from 'next/link';
import styles from './archive.module.css';

export default function EnglishNotFound(){return <main className={styles.page} lang="en"><section className={styles.empty}><h1>This record is not in the archive</h1><p>Search documented matches, players and tournaments across ATP and WTA.</p><p><Link href="/en/matches">Browse matches</Link> · <Link href="/en/players">Browse players</Link> · <Link href="/en/tournaments">Browse tournaments</Link></p></section></main>}
