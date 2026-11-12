import type { ReactNode } from 'react';
import styles from './archive-masthead.module.css';

export function ArchiveMasthead({ title, tools }: { title: string; tools?: ReactNode }) {
  return <header className={styles.masthead} data-archive-masthead="">
    <h1>{title}</h1>
    {tools && <div className={styles.tools}>{tools}</div>}
  </header>;
}
