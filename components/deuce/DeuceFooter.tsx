import Link from 'next/link';
export function DeuceFooter() {
  return <footer className="deuce-footer">
    <Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
    <h2>El archivo del tenis<br />desde 1968.</h2>
    <nav className="footer-nav" aria-label="Archivo y proyecto">{[['Partidos','/buscar'],['Récords','/records'],['Jugadores','/jugadores'],['Torneos','/tournaments'],['Comparar','/comparar'],['Cómo se lee','/info'],['Cobertura','/cobertura'],['Créditos','/credits']].map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
    <p className="legal">© {new Date().getUTCFullYear()} DEUCE · El archivo del tenis</p>
  </footer>;
}
