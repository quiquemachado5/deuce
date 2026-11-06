'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { circuitSectionHref, navigationCircuit, type Circuit } from '@/lib/circuit-navigation';
import styles from './deuce-footer.module.css';

function FooterNavigationLinks({ circuit }: { circuit: Circuit }) {
  return <nav className={styles.navigation} aria-label="Navegación del pie">
    <div className={styles.navigationGroup}>
      <strong>Explorar</strong>
      <Link href={circuitSectionHref('matches',circuit)}>Partidos</Link>
      <Link href={circuitSectionHref('records',circuit)}>Récords</Link>
      <Link href={circuitSectionHref('players',circuit)}>Jugadores</Link>
      <Link href={circuitSectionHref('tournaments',circuit)}>Torneos</Link>
      <Link href={circuitSectionHref('compare',circuit)}>Comparar</Link>
    </div>
    <div className={styles.navigationGroup}>
      <strong>Archivo</strong>
      <Link href="/cobertura">Cobertura</Link>
      <Link href="/info">Cómo se lee</Link>
      <Link href="/licencias">Licencias</Link>
    </div>
    <div className={styles.navigationGroup}>
      <strong>DEUCE</strong>
      <Link href="/sobre">Sobre DEUCE</Link>
      <Link href={circuitSectionHref('matches','atp')}>Archivo ATP</Link>
      <Link href={circuitSectionHref('matches','wta')}>Archivo WTA</Link>
    </div>
  </nav>;
}

function CircuitAwareFooterNavigation() {
  const pathname=usePathname(),searchParams=useSearchParams();
  return <FooterNavigationLinks circuit={navigationCircuit(pathname,searchParams)}/>;
}

export function DeuceFooter() {
  const pathname=usePathname();
  const tone=pathname==='/'||pathname.startsWith('/records')?'dark':'light';
  return <footer className={styles.footer} data-deuce-footer="" data-tone={tone} aria-label="Pie de página">
    <div className={styles.transition} aria-hidden="true" />
    <div className={styles.material}>
      <div className={styles.directory}>
        <div className={styles.directoryRow}>
          <div className={styles.brand}>
            <Link className={styles.logo} href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
            <p>Archivo estadístico de tenis ATP y WTA.</p>
          </div>
          <Suspense fallback={<div className={styles.navigationPending} aria-busy="true"><span className="nc-sr">Cargando navegación del circuito…</span></div>}><CircuitAwareFooterNavigation/></Suspense>
        </div>
        <div className={styles.bottom}>
          <span>© {new Date().getUTCFullYear()} DEUCE · Archivo estadístico de tenis</span>
          <span className={styles.credit}>Made by quiquicius</span>
        </div>
      </div>
    </div>
  </footer>;
}
