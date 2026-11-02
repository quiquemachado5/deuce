import Link from 'next/link';

export function TopbarCircuitNavigationFallback() {
  return <header className="topbar" data-circuit-navigation="pending">
    <Link className="logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
    <nav aria-label="Principal" aria-busy="true">
      <span className="nc-sr">Cargando navegación del circuito…</span>
    </nav>
  </header>;
}

export function FooterCircuitNavigationFallback() {
  return <div className="footer-navigation" data-circuit-navigation="pending" aria-busy="true">
    <span className="nc-sr">Cargando navegación del circuito…</span>
  </div>;
}
