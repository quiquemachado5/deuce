import Link from 'next/link';
export function DeuceFooter() {
  return <footer className="deuce-footer">
    <div className="footer-identity">
      <Link className="logo footer-logo" href="/" aria-label="DEUCE, inicio"><span aria-hidden="true" />DEUCE</Link>
      <p>El archivo del tenis desde 1968.</p>
    </div>
    <nav className="footer-primary" aria-label="Explorar el archivo">
      {[["Partidos","/buscar"],["Récords","/records"],["Jugadores","/jugadores"],["Torneos","/torneos"],["Comparar","/comparar"]].map(([label,href])=><Link href={href} key={href}>{label}</Link>)}
    </nav>
    <div className="footer-utility">
      <Link href="/info">Cómo se lee</Link>
      <Link href="/cobertura">Cobertura</Link>
      <Link href="/credits">Fotografías</Link>
      <span>© {new Date().getUTCFullYear()} DEUCE</span>
    </div>
  </footer>;
}
