import Link from 'next/link';
import styles from './deuce-topbar.module.css';

export function TopbarCircuitNavigationFallback() {
  return <header className={styles.topbar} data-deuce-topbar="" data-circuit-navigation="pending">
    <div className={styles.shell}>
      <div className={styles.topline}>
        <Link className={styles.logo} href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" /></Link>
        <nav className={styles.desktopNavigation} aria-label="Principal" aria-busy="true">
          <span className="nc-sr">Cargando navegación del circuito…</span>
        </nav>
        <span className={styles.fallbackAction} aria-hidden="true" />
      </div>
    </div>
  </header>;
}

export function FooterCircuitNavigationFallback() {
  return <div className="footer-navigation" data-circuit-navigation="pending" aria-busy="true">
    <span className="nc-sr">Cargando navegación del circuito…</span>
  </div>;
}
